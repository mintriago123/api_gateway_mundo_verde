import { ServiceInstance, LoadBalancer } from '../types/service-discovery';
import { Logger } from '../utils/logger';

interface InstanceStats {
  requestCount: number;
  activeConnections: number;
  totalResponseTime: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
}

export class RoundRobinLoadBalancer implements LoadBalancer {
  private instanceStats: Map<string, InstanceStats> = new Map();
  private roundRobinIndex: Map<string, number> = new Map();

  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;
    if (instances.length === 1) return instances[0];

    // Filtrar solo instancias saludables
    const healthyInstances = instances.filter(instance => instance.healthy);
    if (healthyInstances.length === 0) {
      Logger.warn('No healthy instances available for load balancing');
      return null;
    }

    // Usar el nombre del servicio para mantener el índice
    const serviceName = healthyInstances[0].name;
    let index = this.roundRobinIndex.get(serviceName) || 0;
    
    const selectedInstance = healthyInstances[index];
    
    // Actualizar índice para la próxima vez
    this.roundRobinIndex.set(serviceName, (index + 1) % healthyInstances.length);
    
    return selectedInstance;
  }

  recordRequest(instanceId: string): void {
    const stats = this.getOrCreateStats(instanceId);
    stats.requestCount++;
    stats.activeConnections++;
  }

  recordResponse(instanceId: string, success: boolean, responseTime: number): void {
    const stats = this.getOrCreateStats(instanceId);
    stats.activeConnections = Math.max(0, stats.activeConnections - 1);
    stats.totalResponseTime += responseTime;
    
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }

    // Calcular tiempo promedio de respuesta
    const totalRequests = stats.successCount + stats.errorCount;
    stats.averageResponseTime = totalRequests > 0 ? stats.totalResponseTime / totalRequests : 0;
  }

  private getOrCreateStats(instanceId: string): InstanceStats {
    if (!this.instanceStats.has(instanceId)) {
      this.instanceStats.set(instanceId, {
        requestCount: 0,
        activeConnections: 0,
        totalResponseTime: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0
      });
    }
    return this.instanceStats.get(instanceId)!;
  }

  public getStats(instanceId: string): InstanceStats | undefined {
    return this.instanceStats.get(instanceId);
  }

  public getAllStats(): Map<string, InstanceStats> {
    return new Map(this.instanceStats);
  }
}

export class WeightedLoadBalancer implements LoadBalancer {
  private instanceStats: Map<string, InstanceStats> = new Map();

  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;
    if (instances.length === 1) return instances[0];

    const healthyInstances = instances.filter(instance => instance.healthy);
    if (healthyInstances.length === 0) return null;

    // Calcular pesos totales
    const totalWeight = healthyInstances.reduce((sum, instance) => sum + (instance.weight || 1), 0);
    let random = Math.random() * totalWeight;

    // Seleccionar instancia basada en peso
    for (const instance of healthyInstances) {
      random -= (instance.weight || 1);
      if (random <= 0) {
        return instance;
      }
    }

    // Fallback a la primera instancia
    return healthyInstances[0];
  }

  recordRequest(instanceId: string): void {
    const stats = this.getOrCreateStats(instanceId);
    stats.requestCount++;
    stats.activeConnections++;
  }

  recordResponse(instanceId: string, success: boolean, responseTime: number): void {
    const stats = this.getOrCreateStats(instanceId);
    stats.activeConnections = Math.max(0, stats.activeConnections - 1);
    stats.totalResponseTime += responseTime;
    
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }

    const totalRequests = stats.successCount + stats.errorCount;
    stats.averageResponseTime = totalRequests > 0 ? stats.totalResponseTime / totalRequests : 0;
  }

  private getOrCreateStats(instanceId: string): InstanceStats {
    if (!this.instanceStats.has(instanceId)) {
      this.instanceStats.set(instanceId, {
        requestCount: 0,
        activeConnections: 0,
        totalResponseTime: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0
      });
    }
    return this.instanceStats.get(instanceId)!;
  }

  public getStats(instanceId: string): InstanceStats | undefined {
    return this.instanceStats.get(instanceId);
  }

  public getAllStats(): Map<string, InstanceStats> {
    return new Map(this.instanceStats);
  }
}
