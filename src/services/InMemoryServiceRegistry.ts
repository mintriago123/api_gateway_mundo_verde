import { ServiceInstance, ServiceRegistry } from '../types/service-discovery';
import { Logger } from '../utils/logger';

export class InMemoryServiceRegistry implements ServiceRegistry {
  private services: Map<string, ServiceInstance> = new Map();
  private servicesByName: Map<string, Set<string>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(private cleanupInterval: number = 60000) { // 1 minuto
    this.startCleanup();
  }

  async register(service: ServiceInstance): Promise<void> {
    this.services.set(service.id, {
      ...service,
      registeredAt: new Date(),
      lastHeartbeat: new Date(),
      healthy: true
    });

    if (!this.servicesByName.has(service.name)) {
      this.servicesByName.set(service.name, new Set());
    }
    this.servicesByName.get(service.name)!.add(service.id);

    Logger.info(`Service registered: ${service.name}`, {
      id: service.id,
      endpoint: `${service.protocol}://${service.host}:${service.port}`,
      version: service.version
    });
  }

  async deregister(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      
      const serviceIds = this.servicesByName.get(service.name);
      if (serviceIds) {
        serviceIds.delete(serviceId);
        if (serviceIds.size === 0) {
          this.servicesByName.delete(service.name);
        }
      }

      Logger.info(`Service deregistered: ${service.name}`, { id: serviceId });
    }
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    const serviceIds = this.servicesByName.get(serviceName);
    if (!serviceIds) {
      return [];
    }

    const instances: ServiceInstance[] = [];
    for (const serviceId of serviceIds) {
      const service = this.services.get(serviceId);
      if (service) {
        instances.push(service);
      }
    }

    return instances;
  }

  async getHealthyInstances(serviceName: string): Promise<ServiceInstance[]> {
    const instances = await this.discover(serviceName);
    return instances.filter(instance => instance.healthy);
  }

  async updateHealth(serviceId: string, healthy: boolean): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      service.healthy = healthy;
      service.lastHeartbeat = new Date();
      
      if (!healthy) {
        Logger.warn(`Service marked as unhealthy: ${service.name}`, { id: serviceId });
      }
    }
  }

  async heartbeat(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (service) {
      service.lastHeartbeat = new Date();
      service.healthy = true;
    }
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    const staleServices: string[] = [];

    for (const [serviceId, service] of this.services) {
      const timeSinceHeartbeat = now.getTime() - service.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > 120000) { // 2 minutos sin heartbeat
        staleServices.push(serviceId);
      }
    }

    for (const serviceId of staleServices) {
      await this.deregister(serviceId);
      Logger.warn(`Service removed due to stale heartbeat`, { id: serviceId });
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        Logger.error('Error during service cleanup:', error);
      });
    }, this.cleanupInterval);
  }

  public stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  // Métodos para debugging
  public getAllServices(): ServiceInstance[] {
    return Array.from(this.services.values());
  }

  public getServicesByName(serviceName: string): ServiceInstance[] {
    const serviceIds = this.servicesByName.get(serviceName) || new Set();
    return Array.from(serviceIds).map(id => this.services.get(id)!).filter(Boolean);
  }
}
