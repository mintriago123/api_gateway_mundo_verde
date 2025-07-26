import httpProxy from 'http-proxy';
import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import config, { ServiceConfig } from '../config';
import { ProxyRequest } from '../types';
import { Logger } from '../utils/logger';
import { ServiceDiscoveryService } from './ServiceDiscoveryService';

export class ProxyService {
  private proxy: httpProxy;
  private serviceHealthStatus: Map<string, boolean> = new Map();
  private serviceDiscovery?: ServiceDiscoveryService;

  constructor(serviceDiscovery?: ServiceDiscoveryService) {
    this.proxy = httpProxy.createProxyServer({
      timeout: 30000, // 30 segundos
      proxyTimeout: 30000,
      changeOrigin: true
    });

    this.serviceDiscovery = serviceDiscovery;
    this.setupProxyErrorHandling();
    this.initializeHealthChecks();
  }

  private setupProxyErrorHandling(): void {
    this.proxy.on('error', (err: any, req: any, res: any) => {
      Logger.error(`Proxy error for ${req.serviceName || 'unknown service'}:`, {
        error: err.message,
        url: req.originalUrl,
        target: req.url
      });

      if (res && !res.headersSent) {
        res.status(502).json({
          error: {
            message: 'Service temporarily unavailable',
            status: 502,
            timestamp: new Date().toISOString(),
            service: req.serviceName
          }
        });
      }
    });

    this.proxy.on('proxyReq', (proxyReq: any, req: any) => {
      // Añadir headers adicionales si es necesario
      proxyReq.setHeader('X-Forwarded-Proto', 'http');
      proxyReq.setHeader('X-Forwarded-Host', req.get('host') || '');
      proxyReq.setHeader('X-Gateway-Version', '1.0.0');
    });

    this.proxy.on('proxyRes', (proxyRes: any, req: any, res: any) => {
      // Log de respuesta exitosa
      const duration = Date.now() - (req.proxyStartTime || Date.now());
      Logger.info(`Proxy response from ${req.serviceName}: ${proxyRes.statusCode} - ${duration}ms`);
    });
  }

  private async initializeHealthChecks(): Promise<void> {
    if (!config.healthCheck.enabled) return;

    Logger.info('Initializing health checks for services...');
    
    // Verificar estado inicial de los servicios
    for (const service of config.services) {
      if (service.enabled) {
        await this.checkServiceHealth(service);
      }
    }

    // Configurar verificación periódica
    setInterval(async () => {
      for (const service of config.services) {
        if (service.enabled) {
          await this.checkServiceHealth(service);
        }
      }
    }, config.healthCheck.interval);
  }

  private async checkServiceHealth(service: ServiceConfig): Promise<void> {
    try {
      const healthUrl = `${service.target}/health`;
      Logger.debug(`Checking health for ${service.name} at ${healthUrl}`);
      
      // Configurar timeout con AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'API-Gateway-Health-Check/1.0.0'
        }
      });

      clearTimeout(timeoutId);
      const isHealthy = response.ok;
      this.serviceHealthStatus.set(service.name, isHealthy);

      if (isHealthy) {
        Logger.debug(`✅ Service ${service.name} is healthy (${response.status})`);
      } else {
        Logger.warn(`⚠️  Service ${service.name} is unhealthy`, {
          status: response.status,
          statusText: response.statusText,
          target: healthUrl
        });
      }
    } catch (error) {
      this.serviceHealthStatus.set(service.name, false);
      
      if (error instanceof Error && error.name === 'AbortError') {
        Logger.error(`❌ Health check timeout for ${service.name}`, {
          target: `${service.target}/health`,
          timeout: '5s'
        });
      } else {
        Logger.error(`❌ Health check failed for ${service.name}:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          target: `${service.target}/health`,
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        });
      }
    }
  }

  public createProxyMiddleware(service: ServiceConfig) {
    return async (req: ProxyRequest, res: Response, next: NextFunction): Promise<void> => {
      if (!service.enabled) {
        res.status(503).json({
          error: {
            message: `Service ${service.name} is disabled`,
            status: 503,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }

      // Verificar si el servicio está saludable (temporalmente deshabilitado)
      /*
      const isHealthy = this.serviceHealthStatus.get(service.name);
      if (isHealthy === false) {
        res.status(503).json({
          error: {
            message: `Service ${service.name} is currently unavailable`,
            status: 503,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      */

      // Configurar información del servicio en la request
      req.serviceName = service.name;
      req.proxyStartTime = Date.now();

      // Modificar la URL para el servicio de destino
      req.url = req.url.replace(service.stripPath, '');
      
      // Ensure the URL starts with /
      if (!req.url.startsWith('/')) {
        req.url = '/' + req.url;
      }

      // Determinar el target usando Service Discovery si está disponible
      let target = service.target;
      if (this.serviceDiscovery) {
        const discoveredUrl = await this.serviceDiscovery.getServiceUrl(service.name);
        if (discoveredUrl) {
          target = discoveredUrl;
          Logger.info(`Using discovered service URL for ${service.name}: ${target}`);
        } else {
          Logger.warn(`No instances found via service discovery for ${service.name}, falling back to configured target`);
        }
      }

      Logger.info(`Proxying request to ${service.name}`, {
        originalUrl: req.originalUrl,
        modifiedUrl: req.url,
        target: target,
        method: req.method,
        discoveryUsed: !!this.serviceDiscovery
      });

      this.proxy.web(req, res, { target: target }, (error) => {
        if (error) {
          Logger.error(`Proxy error for ${service.name}:`, error);
          next(error);
        }
      });
    };
  }

  public getServiceStatus(): Array<{ name: string; healthy: boolean }> {
    return config.services.map(service => ({
      name: service.name,
      healthy: this.serviceHealthStatus.get(service.name) ?? false
    }));
  }

  public async refreshServiceHealth(): Promise<void> {
    Logger.info('Manually refreshing service health checks...');
    for (const service of config.services) {
      if (service.enabled) {
        await this.checkServiceHealth(service);
      }
    }
  }

  public createDynamicProxyMiddleware(serviceName: string, serviceUrl: string) {
    return async (req: ProxyRequest, res: Response, next: NextFunction): Promise<void> => {
      // Configurar información del servicio en la request
      req.serviceName = serviceName;
      req.proxyStartTime = Date.now();

      // Modificar la URL para el servicio de destino - remover el primer segmento
      const pathSegments = req.path.split('/').filter(segment => segment.length > 0);
      pathSegments.shift(); // Remover el nombre del servicio
      req.url = '/' + pathSegments.join('/');

      // Si hay query parameters, agregarlos
      if (req.query && Object.keys(req.query).length > 0) {
        const queryString = new URLSearchParams(req.query as any).toString();
        req.url += (req.url.includes('?') ? '&' : '?') + queryString;
      }

      Logger.info(`Proxying dynamic request to ${serviceName}`, {
        originalUrl: req.originalUrl,
        modifiedUrl: req.url,
        target: serviceUrl,
        method: req.method,
        discoveryUsed: true
      });

      this.proxy.web(req, res, { target: serviceUrl }, (error) => {
        if (error) {
          Logger.error(`Dynamic proxy error for ${serviceName}:`, error);
          next(error);
        }
      });
    };
  }
}
