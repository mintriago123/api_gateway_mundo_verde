import { Request, Response } from 'express';

export interface ProxyRequest extends Request {
  proxyStartTime?: number;
  serviceName?: string;
}

export interface ProxyResponse extends Response {
  proxyEndTime?: number;
}

export interface ServiceHealthStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

export interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  services: ServiceHealthStatus[];
}
