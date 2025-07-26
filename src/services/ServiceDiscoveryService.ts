import { ServiceInstance, ServiceRegistry, LoadBalancer, ServiceDiscoveryConfig } from '../types/service-discovery';
import { InMemoryServiceRegistry } from './InMemoryServiceRegistry';
import { RoundRobinLoadBalancer, WeightedLoadBalancer } from './LoadBalancer';
import { Logger } from '../utils/logger';
import fetch from 'node-fetch';

export class ServiceDiscoveryService {
  private registry: ServiceRegistry;
  private loadBalancer: LoadBalancer;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(private config: ServiceDiscoveryConfig) {
    // Inicializar registry
    switch (config.registryType) {
      case 'memory':
        this.registry = new InMemoryServiceRegistry(config.cleanupInterval);
        break;
      default:
        throw new Error(`Unsupported registry type: ${config.registryType}`);
    }

    // Inicializar load balancer
    switch (config.loadBalancingStrategy) {
      case 'round-robin':
        this.loadBalancer = new RoundRobinLoadBalancer();
        break;
      case 'weighted':
        this.loadBalancer = new WeightedLoadBalancer();
        break;
      default:
        this.loadBalancer = new RoundRobinLoadBalancer();
    }

    this.startHealthChecks();
  }

  async registerService(service: Omit<ServiceInstance, 'id' | 'registeredAt' | 'lastHeartbeat' | 'healthy'>): Promise<ServiceInstance> {
    const serviceId = this.generateServiceId(service.name, service.host, service.port);
    
    const fullService: ServiceInstance = {
      ...service,
      id: serviceId,
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
      healthy: true
    };

    await this.registry.register(fullService);
    return fullService;
  }

  async deregisterService(serviceId: string): Promise<boolean> {
    try {
      await this.registry.deregister(serviceId);
      return true;
    } catch (error) {
      Logger.error(`Failed to deregister service ${serviceId}:`, error);
      return false;
    }
  }

  async discoverServices(serviceName: string): Promise<ServiceInstance[]> {
    return await this.registry.discover(serviceName);
  }

  async getServiceInstance(serviceName: string): Promise<ServiceInstance | null> {
    const instances = await this.registry.getHealthyInstances(serviceName);
    return this.loadBalancer.selectInstance(instances);
  }

  async getServiceUrl(serviceName: string): Promise<string | null> {
    const instance = await this.getServiceInstance(serviceName);
    if (!instance) {
      Logger.warn(`No healthy instances found for service: ${serviceName}`);
      return null;
    }

    return `${instance.protocol}://${instance.host}:${instance.port}`;
  }

  async getAllServices(): Promise<ServiceInstance[]> {
    if (this.registry instanceof InMemoryServiceRegistry) {
      return this.registry.getAllServices();
    }
    return [];
  }

  async heartbeat(serviceId: string): Promise<void> {
    await this.registry.heartbeat(serviceId);
  }

  private generateServiceId(name: string, host: string, port: number): string {
    return `${name}-${host}-${port}-${Date.now()}`;
  }

  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    try {
      // Obtener todos los servicios únicos
      const allServices = await this.getAllUniqueServices();
      
      for (const serviceName of allServices) {
        const instances = await this.registry.discover(serviceName);
        
        for (const instance of instances) {
          await this.checkInstanceHealth(instance);
        }
      }
    } catch (error) {
      Logger.error('Error during health checks:', error);
    }
  }

  private async getAllUniqueServices(): Promise<string[]> {
    // Esto es específico para InMemoryServiceRegistry
    if (this.registry instanceof InMemoryServiceRegistry) {
      const allServices = this.registry.getAllServices();
      return [...new Set(allServices.map(service => service.name))];
    }
    return [];
  }

  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    try {
      const healthUrl = `${instance.protocol}://${instance.host}:${instance.port}/health`;
      const startTime = Date.now();
      
      const response = await fetch(healthUrl, {
        method: 'GET'
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      await this.registry.updateHealth(instance.id, isHealthy);
      this.loadBalancer.recordResponse(instance.id, isHealthy, responseTime);

      if (!isHealthy) {
        Logger.warn(`Health check failed for ${instance.name}`, {
          id: instance.id,
          status: response.status,
          responseTime
        });
      }

    } catch (error) {
      await this.registry.updateHealth(instance.id, false);
      this.loadBalancer.recordResponse(instance.id, false, 5000); // Timeout como tiempo de respuesta

      Logger.error(`Health check error for ${instance.name}:`, {
        id: instance.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getServiceStats(): Promise<any> {
    const stats: any = {};
    
    if (this.registry instanceof InMemoryServiceRegistry) {
      const allServices = this.registry.getAllServices();
      
      for (const service of allServices) {
        if (!stats[service.name]) {
          stats[service.name] = {
            totalInstances: 0,
            healthyInstances: 0,
            instances: []
          };
        }
        
        stats[service.name].totalInstances++;
        if (service.healthy) {
          stats[service.name].healthyInstances++;
        }
        
        stats[service.name].instances.push({
          id: service.id,
          endpoint: `${service.protocol}://${service.host}:${service.port}`,
          healthy: service.healthy,
          version: service.version,
          registeredAt: service.registeredAt,
          lastHeartbeat: service.lastHeartbeat
        });
      }
    }
    
    return stats;
  }

  public stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.registry instanceof InMemoryServiceRegistry) {
      this.registry.stop();
    }
  }
}

// Factory function para crear el servicio
export function createServiceDiscovery(config?: Partial<ServiceDiscoveryConfig>): ServiceDiscoveryService {
  const defaultConfig: ServiceDiscoveryConfig = {
    enabled: true,
    registryType: 'memory',
    healthCheckInterval: 30000, // 30 segundos
    heartbeatTimeout: 60000,    // 1 minuto
    cleanupInterval: 60000,     // 1 minuto
    loadBalancingStrategy: 'round-robin'
  };

  return new ServiceDiscoveryService({ ...defaultConfig, ...config });
}
