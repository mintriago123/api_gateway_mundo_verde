import { Router, Request, Response } from 'express';
import { ServiceDiscoveryService } from '../services/ServiceDiscoveryService';
import { ServiceInstance } from '../types/service-discovery';
import { Logger } from '../utils/logger';

export const createServiceDiscoveryRoutes = (serviceDiscovery?: ServiceDiscoveryService): Router => {
  const router = Router();

  if (!serviceDiscovery) {
    // Si Service Discovery no está habilitado, retornar endpoints informativos
    router.get('/services', (req: Request, res: Response) => {
      res.status(503).json({
        error: 'Service Discovery is not enabled',
        message: 'Enable SERVICE_DISCOVERY_ENABLED=true in environment variables'
      });
    });

    return router;
  }

  // Listar todos los servicios registrados
  router.get('/services', async (req: Request, res: Response) => {
    try {
      const services = await serviceDiscovery.getAllServices();
      res.json({
        total: services.length,
        services: services.map((service: ServiceInstance) => ({
          id: service.id,
          name: service.name,
          endpoint: `${service.protocol}://${service.host}:${service.port}`,
          version: service.version,
          status: service.healthy ? 'healthy' : 'unhealthy',
          lastSeen: service.lastHeartbeat,
          metadata: service.metadata,
          tags: service.tags
        }))
      });
    } catch (error) {
      Logger.error('Error getting services:', error);
      res.status(500).json({ error: 'Failed to get services' });
    }
  });

  // Obtener servicios por nombre
  router.get('/services/:serviceName', async (req: Request, res: Response) => {
    try {
      const services = await serviceDiscovery.discoverServices(req.params.serviceName);
      if (services.length === 0) {
        return res.status(404).json({
          error: 'Service not found',
          serviceName: req.params.serviceName
        });
      }

      res.json({
        serviceName: req.params.serviceName,
        instances: services.length,
        services: services.map((service: ServiceInstance) => ({
          id: service.id,
          endpoint: `${service.protocol}://${service.host}:${service.port}`,
          version: service.version,
          status: service.healthy ? 'healthy' : 'unhealthy',
          lastSeen: service.lastHeartbeat
        }))
      });
    } catch (error) {
      Logger.error(`Error getting service ${req.params.serviceName}:`, error);
      res.status(500).json({ error: 'Failed to get service' });
    }
  });

  // Registrar un nuevo servicio
  router.post('/services', async (req: Request, res: Response) => {
    try {
      const { name, host, port, protocol = 'http', version = '1.0.0', metadata = {}, tags = [] } = req.body;

      if (!name || !host || !port) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['name', 'host', 'port']
        });
      }

      const serviceInfo = {
        name,
        host,
        port: parseInt(port),
        protocol: protocol as 'http' | 'https',
        version,
        metadata,
        tags: [...tags, 'manually-registered']
      };

      const service = await serviceDiscovery.registerService(serviceInfo);

      Logger.info(`Service registered manually: ${name}`, {
        endpoint: `${protocol}://${host}:${port}`,
        registeredBy: 'manual'
      });

      res.status(201).json({
        message: 'Service registered successfully',
        service: {
          id: service.id,
          name: service.name,
          endpoint: `${service.protocol}://${service.host}:${service.port}`,
          version: service.version,
          status: service.healthy ? 'healthy' : 'unhealthy'
        }
      });
    } catch (error) {
      Logger.error('Error registering service:', error);
      res.status(500).json({ error: 'Failed to register service' });
    }
  });

  // Desregistrar un servicio
  router.delete('/services/:serviceId', async (req: Request, res: Response) => {
    try {
      const success = await serviceDiscovery.deregisterService(req.params.serviceId);
      
      if (success) {
        Logger.info(`Service deregistered: ${req.params.serviceId}`);
        res.json({ message: 'Service deregistered successfully' });
      } else {
        res.status(404).json({ error: 'Service not found' });
      }
    } catch (error) {
      Logger.error(`Error deregistering service ${req.params.serviceId}:`, error);
      res.status(500).json({ error: 'Failed to deregister service' });
    }
  });

  // Health check de un servicio específico
  router.post('/services/:serviceId/health', async (req: Request, res: Response) => {
    try {
      // Esta funcionalidad se puede implementar más tarde
      res.status(501).json({
        message: 'Manual health check not implemented yet',
        suggestion: 'Health checks are performed automatically'
      });
    } catch (error) {
      Logger.error(`Error checking health for service ${req.params.serviceId}:`, error);
      res.status(500).json({ error: 'Failed to check service health' });
    }
  });

  // Estadísticas del Service Discovery
  router.get('/discovery/stats', async (req: Request, res: Response) => {
    try {
      const allServices = await serviceDiscovery.getAllServices();
      const healthyServices = allServices.filter((s: ServiceInstance) => s.healthy);
      const unhealthyServices = allServices.filter((s: ServiceInstance) => !s.healthy);

      // Agrupar por nombre de servicio
      const serviceGroups = allServices.reduce((acc: Record<string, ServiceInstance[]>, service: ServiceInstance) => {
        if (!acc[service.name]) {
          acc[service.name] = [];
        }
        acc[service.name].push(service);
        return acc;
      }, {});

      res.json({
        total: allServices.length,
        healthy: healthyServices.length,
        unhealthy: unhealthyServices.length,
        serviceTypes: Object.keys(serviceGroups).length,
        serviceGroups: Object.entries(serviceGroups).map(([name, instances]) => ({
          name,
          instances: instances.length,
          healthy: instances.filter((s: ServiceInstance) => s.healthy).length,
          unhealthy: instances.filter((s: ServiceInstance) => !s.healthy).length
        }))
      });
    } catch (error) {
      Logger.error('Error getting discovery stats:', error);
      res.status(500).json({ error: 'Failed to get discovery stats' });
    }
  });

  return router;
};
