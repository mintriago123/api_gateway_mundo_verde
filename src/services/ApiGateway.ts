import express, { Express } from 'express';
import cors from 'cors';
import config from '../config';
import { ProxyService } from './ProxyService';
import { createRoutes } from '../routes';
import { 
  requestLogger, 
  errorHandler, 
  notFoundHandler, 
  corsHeaders 
} from '../middleware';
import { Logger } from '../utils/logger';
import { ServiceDiscoveryService, createServiceDiscovery } from './ServiceDiscoveryService';

export class ApiGateway {
  private app: Express;
  private proxyService: ProxyService;
  private serviceDiscovery?: ServiceDiscoveryService;

  constructor() {
    this.app = express();
    
    // Inicializar Service Discovery si está habilitado
    if (config.serviceDiscovery.enabled) {
      this.serviceDiscovery = createServiceDiscovery(config.serviceDiscovery);
      Logger.info('Service Discovery enabled', { 
        strategy: config.serviceDiscovery.loadBalancingStrategy,
        registry: config.serviceDiscovery.registryType 
      });
    }
    
    this.proxyService = new ProxyService(this.serviceDiscovery);
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
    // Registrar servicios configurados en Service Discovery si está habilitado
    if (this.serviceDiscovery) {
      this.registerConfiguredServices();
    }
  }

  private setupMiddleware(): void {
    // Trust proxy headers (importante para load balancers)
    this.app.set('trust proxy', 1);

    // Request logging
    this.app.use(requestLogger);

    // CORS handling
    if (config.corsEnabled) {
      this.app.use(cors({
        origin: process.env.CORS_ORIGIN || true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
      }));
    } else {
      this.app.use(corsHeaders);
    }

    // Parse JSON bodies
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Powered-By', 'API Gateway');
      next();
    });
  }

  private setupRoutes(): void {
    // Setup all routes including proxy routes
    this.app.use('/', createRoutes(this.proxyService, this.serviceDiscovery));
  }

  private setupErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);
    
    // Global error handler
    this.app.use(errorHandler);
  }

  private async registerConfiguredServices(): Promise<void> {
    if (!this.serviceDiscovery) return;

    try {
      for (const service of config.services) {
        if (service.enabled) {
          // Extraer host y puerto de la URL del target
          const url = new URL(service.target);
          
          await this.serviceDiscovery.registerService({
            name: service.name,
            host: url.hostname,
            port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
            protocol: url.protocol.replace(':', '') as 'http' | 'https',
            version: '1.0.0',
            metadata: {
              route: service.route,
              stripPath: service.stripPath
            },
            tags: ['configured', 'api-gateway-managed']
          });

          Logger.info(`Registered service in discovery: ${service.name}`, {
            target: service.target,
            route: service.route
          });
        }
      }
    } catch (error) {
      Logger.error('Error registering configured services:', error);
    }
  }

  public start(): void {
    const server = this.app.listen(config.port, () => {
      Logger.success(`🚀 API Gateway is running!`, {
        port: config.port,
        environment: config.env,
        servicesEnabled: config.services.filter((s: any) => s.enabled).length,
        healthCheckEnabled: config.healthCheck.enabled
      });

      Logger.info('📋 Configured services:', {
        services: config.services.map((s: any) => ({
          name: s.name,
          route: s.route,
          target: s.target,
          enabled: s.enabled
        }))
      });

      Logger.info('🔗 Available endpoints:', {
        health: `http://localhost:${config.port}/api-gateway/health`,
        info: `http://localhost:${config.port}/api-gateway/info`,
        metrics: `http://localhost:${config.port}/api-gateway/metrics`
      });
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      Logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      // Detener Service Discovery
      if (this.serviceDiscovery) {
        this.serviceDiscovery.stop();
        Logger.info('Service Discovery stopped.');
      }
      
      server.close(() => {
        Logger.info('HTTP server closed.');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        Logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      Logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('Unhandled Rejection at:', { promise, reason });
      process.exit(1);
    });
  }

  public getApp(): Express {
    return this.app;
  }
}
