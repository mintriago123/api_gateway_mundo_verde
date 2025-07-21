export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  version: string;
  metadata?: Record<string, any>;
  registeredAt: Date;
  lastHeartbeat: Date;
  healthy: boolean;
  weight?: number; // Para load balancing
  tags?: string[];
}

export interface ServiceDiscoveryConfig {
  registryType: 'memory' | 'consul' | 'etcd' | 'redis';
  healthCheckInterval: number;
  heartbeatTimeout: number;
  cleanupInterval: number;
  loadBalancingStrategy: 'round-robin' | 'weighted' | 'least-connections' | 'random';
}

export interface ServiceRegistry {
  register(service: ServiceInstance): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInstance[]>;
  getHealthyInstances(serviceName: string): Promise<ServiceInstance[]>;
  updateHealth(serviceId: string, healthy: boolean): Promise<void>;
  heartbeat(serviceId: string): Promise<void>;
  cleanup(): Promise<void>;
}

export interface LoadBalancer {
  selectInstance(instances: ServiceInstance[]): ServiceInstance | null;
  recordRequest(instanceId: string): void;
  recordResponse(instanceId: string, success: boolean, responseTime: number): void;
}
