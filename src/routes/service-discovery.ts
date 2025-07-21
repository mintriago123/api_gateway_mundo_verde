import { Router, Request, Response } from 'express';
import { ServiceDiscoveryService } from '../services/ServiceDiscoveryService';
import { Logger } from '../utils/logger';

export const createServiceDiscoveryRoutes = (serviceDiscovery?: ServiceDiscoveryService): Router => {
  const router = Router();

  if (!serviceDiscovery) {
    router.all('*', (req: Request, res: Response) => {
      res.status(503).json({
        error: 'Service Discovery is not enabled'
      });
    });
    return router;
  }

  // Listar todos los servicios
  router.get('/services', async (req: Request, res: Response) => {
    try {
      const stats = await serviceDiscovery.getServiceStats();
      res.json({
        services: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Error getting service stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Obtener instancias de un servicio específico
  router.get('/services/:serviceName', async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.params;
      const instances = await serviceDiscovery.discoverServices(serviceName);
      
      res.json({
        serviceName,
        instances: instances.map(instance => ({
          id: instance.id,
          endpoint: `${instance.protocol}://${instance.host}:${instance.port}`,
          healthy: instance.healthy,
          version: instance.version,
          metadata: instance.metadata,
          tags: instance.tags,
          registeredAt: instance.registeredAt,
          lastHeartbeat: instance.lastHeartbeat
        })),
        totalInstances: instances.length,
        healthyInstances: instances.filter(i => i.healthy).length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      Logger.error(`Error getting instances for service ${req.params.serviceName}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Registrar un nuevo servicio
  router.post('/services', async (req: Request, res: Response) => {
    try {
      const { name, host, port, protocol = 'http', version = '1.0.0', metadata = {}, tags = [] } = req.body;

      if (!name || !host || !port) {
        return res.status(400).json({
          error: 'Missing required fields: name, host, port'
        });
      }

      const serviceId = await serviceDiscovery.registerService({
        name,
        host,
        port,
        protocol,
        version,
        metadata,
        tags
      });

      Logger.info(`Service registered via API: ${name}`, {
        id: serviceId,
        endpoint: `${protocol}://${host}:${port}`
      });

      res.status(201).json({
        serviceId,
        message: 'Service registered successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      Logger.error('Error registering service:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Desregistrar un servicio
  router.delete('/services/:serviceId', async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      await serviceDiscovery.deregisterService(serviceId);

      Logger.info(`Service deregistered via API: ${serviceId}`);

      res.json({
        message: 'Service deregistered successfully',
        serviceId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      Logger.error(`Error deregistering service ${req.params.serviceId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Enviar heartbeat para un servicio
  router.post('/services/:serviceId/heartbeat', async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      await serviceDiscovery.heartbeat(serviceId);

      res.json({
        message: 'Heartbeat received',
        serviceId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      Logger.error(`Error processing heartbeat for service ${req.params.serviceId}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
