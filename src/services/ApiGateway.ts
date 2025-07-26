import express, { Express } from 'express';
import cors from 'cors';
import { createServer, Server } from 'http';
import config from '../config';
import { ProxyService } from './ProxyService';
import { createRoutes } from '../routes';
import { 
  requestLogger, 
  errorHandler, 
  notFoundHandler, 
  corsHeaders 
} from '../middleware';
import { createGraphQLMiddleware, createGraphQLPlaygroundMiddleware } from '../middleware/graphqlMiddleware';
import { Logger } from '../utils/logger';
import { ServiceDiscoveryService, createServiceDiscovery } from './ServiceDiscoveryService';
import { GraphQLService } from '../graphql/GraphQLService';

export class ApiGateway {
  private app: Express;
  private server?: Server;
  private proxyService: ProxyService;
  private serviceDiscovery?: ServiceDiscoveryService;
  private graphQLService?: GraphQLService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    
    // Inicializar Service Discovery si está habilitado
    if (config.serviceDiscovery.enabled) {
      this.serviceDiscovery = createServiceDiscovery(config.serviceDiscovery);
      Logger.info('Service Discovery enabled', { 
        strategy: config.serviceDiscovery.loadBalancingStrategy,
        registry: config.serviceDiscovery.registryType 
      });
    }
    
    this.proxyService = new ProxyService(this.serviceDiscovery);
    
    // Inicializar GraphQL Service
    this.graphQLService = new GraphQLService(this.serviceDiscovery, this.proxyService);
    
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
    
    // Setup GraphQL endpoints
    if (this.graphQLService) {
      // GraphQL Playground (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        this.app.get('/playground', createGraphQLPlaygroundMiddleware());
        Logger.info('GraphQL Playground available at /playground');
      }
      
      // GraphQL API endpoint
      this.app.post('/graphql', createGraphQLMiddleware(this.graphQLService));
      Logger.success('GraphQL endpoint configured at /graphql');
    }
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

  public async start(): Promise<void> {
    try {
      // Inicializar GraphQL Server primero
      if (this.graphQLService && this.server) {
        await this.graphQLService.initialize(this.server);
        Logger.success('GraphQL Server initialized');
      }

      // Iniciar el servidor HTTP
      this.server!.listen(config.port, () => {
        Logger.success(`🚀 API Gateway is running!`, {
          port: config.port,
          environment: config.env,
          servicesEnabled: config.services.filter((s: any) => s.enabled).length,
          healthCheckEnabled: config.healthCheck.enabled,
          graphQLEnabled: !!this.graphQLService
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
          metrics: `http://localhost:${config.port}/api-gateway/metrics`,
          graphql: `http://localhost:${config.port}/graphql`,
          ...(process.env.NODE_ENV !== 'production' && {
            playground: `http://localhost:${config.port}/playground`
          })
        });
      });

      // Graceful shutdown
      const gracefulShutdown = async (signal: string) => {
        Logger.info(`Received ${signal}. Starting graceful shutdown...`);
        
        // Detener GraphQL Server
        if (this.graphQLService) {
          await this.graphQLService.stop();
          Logger.info('GraphQL Server stopped.');
        }
        
        // Detener Service Discovery
        if (this.serviceDiscovery) {
          this.serviceDiscovery.stop();
          Logger.info('Service Discovery stopped.');
        }
        
        this.server!.close(() => {
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

    } catch (error) {
      Logger.error('Failed to start API Gateway:', error);
      process.exit(1);
    }
  }

  public getApp(): Express {
    return this.app;
  }
}
