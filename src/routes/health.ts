import { Router, Request, Response } from 'express';
import { ProxyService } from '../services/ProxyService';
import { ServiceDiscoveryService } from '../services/ServiceDiscoveryService';
import config from '../config';
import { Logger } from '../utils/logger';
import { formatDuration } from '../utils/logger';

const startTime = Date.now();

export const createHealthRoutes = (proxyService: ProxyService, serviceDiscovery?: ServiceDiscoveryService): Router => {
  const router = Router();

  try {
    // Health check endpoint
    router.get('/health', (req: Request, res: Response) => {
      try {
        const serviceStatuses = proxyService.getServiceStatus();
        let discoveredServices: any[] = [];
        
        // Si hay Service Discovery, incluir también esos servicios
        if (serviceDiscovery) {
          // Esta será una operación síncrona simplificada
          discoveredServices = [];
        }
        
        const allServicesHealthy = serviceStatuses.every(service => service.healthy);
        
        const healthStatus = {
          status: allServicesHealthy ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          uptime: formatDuration(Date.now() - startTime),
          version: '1.0.0',
          environment: config.env,
          services: serviceStatuses,
          serviceDiscovery: {
            enabled: !!serviceDiscovery,
            discoveredServices: discoveredServices.length
          }
        };

        const statusCode = allServicesHealthy ? 200 : 503;
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        Logger.error('Error in health endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Simple liveness probe
    router.get('/live', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: formatDuration(Date.now() - startTime)
      });
    });

    return router;
  } catch (error) {
    Logger.error('Error creating health routes:', error);
    throw error;
  }
};
