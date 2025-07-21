import { ServiceDiscoveryService } from '../services/ServiceDiscoveryService';
import { ProxyService } from '../services/ProxyService';

export interface GraphQLContext {
  serviceDiscovery?: ServiceDiscoveryService;
  proxyService: ProxyService;
  requestId: string;
  userAgent?: string;
  clientIp?: string;
}

export interface ServiceInfo {
  id: string;
  name: string;
  endpoint: string;
  version: string;
  status: 'healthy' | 'unhealthy';
  lastSeen: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface GatewayStats {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  uptime: string;
  version: string;
  environment: string;
}

export interface ProxyRequest {
  serviceName: string;
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ProxyResponse {
  statusCode: number;
  data?: any;
  error?: string;
  responseTime: number;
}
