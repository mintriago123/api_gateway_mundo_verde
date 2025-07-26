import dotenv from 'dotenv';
import { ServiceDiscoveryConfig } from '../types/service-discovery';

dotenv.config();

export interface ServiceConfig {
  name: string;
  route: string;
  target: string;
  stripPath: string;
  enabled: boolean;
}

export interface AppConfig {
  port: number;
  env: string;
  corsEnabled: boolean;
  services: ServiceConfig[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
  };
  serviceDiscovery: ServiceDiscoveryConfig;
}

const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  corsEnabled: process.env.CORS_ENABLED === 'true' || true,
  services: [
    // Los servicios se registrarán dinámicamente a través de Service Discovery
    // o se pueden configurar aquí estáticamente si es necesario
  ],
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) // límite de requests por ventana
  },
  healthCheck: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true' || true,
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10) // 30 segundos
  },
  serviceDiscovery: {
    enabled: process.env.SERVICE_DISCOVERY_ENABLED === 'true' || true,
    registryType: (process.env.SERVICE_DISCOVERY_REGISTRY as any) || 'memory',
    healthCheckInterval: parseInt(process.env.SERVICE_DISCOVERY_HEALTH_INTERVAL || '30000', 10),
    heartbeatTimeout: parseInt(process.env.SERVICE_DISCOVERY_HEARTBEAT_TIMEOUT || '60000', 10),
    cleanupInterval: parseInt(process.env.SERVICE_DISCOVERY_CLEANUP_INTERVAL || '60000', 10),
    loadBalancingStrategy: (process.env.SERVICE_DISCOVERY_LB_STRATEGY as any) || 'round-robin'
  }
};

export default config;
