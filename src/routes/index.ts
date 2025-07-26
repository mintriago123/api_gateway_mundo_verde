import { Router } from 'express';
import { ProxyService } from '../services/ProxyService';
import { createHealthRoutes } from './health';
import { createServiceDiscoveryRoutes } from './serviceDiscovery';
import config from '../config';
import { Logger } from '../utils/logger';
import { ServiceDiscoveryService } from '../services/ServiceDiscoveryService';

export const createRoutes = (proxyService: ProxyService, serviceDiscovery?: ServiceDiscoveryService): Router => {
  const router = Router();

  try {
    // Health and monitoring routes
    router.use('/api-gateway', createHealthRoutes(proxyService, serviceDiscovery));

    // Service Discovery management routes
    router.use('/api-gateway', createServiceDiscoveryRoutes(serviceDiscovery));

    // Dynamic service routes based on configuration
    config.services.forEach(service => {
      if (service.enabled) {
        Logger.info(`Setting up route: ${service.route}/*`);
        router.all(`${service.route}/*`, proxyService.createProxyMiddleware(service));
      }
    });

    return router;
  } catch (error) {
    Logger.error('Error setting up routes:', error);
    throw error;
  }
};
