import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { Express, Request, Response } from 'express';
import { Server } from 'http';
import { typeDefs } from './schemas';
import { resolvers } from './resolvers';
import { GraphQLContext } from './types';
import { ServiceDiscoveryService } from '../services/ServiceDiscoveryService';
import { ProxyService } from '../services/ProxyService';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class GraphQLService {
  private server: ApolloServer<GraphQLContext>;
  private serviceDiscovery?: ServiceDiscoveryService;
  private proxyService: ProxyService;

  constructor(serviceDiscovery?: ServiceDiscoveryService, proxyService?: ProxyService) {
    this.serviceDiscovery = serviceDiscovery;
    this.proxyService = proxyService!;
    
    this.server = new ApolloServer<GraphQLContext>({
      typeDefs,
      resolvers,
      introspection: process.env.NODE_ENV !== 'production', // Habilitar introspección en desarrollo
      plugins: []
    });
  }

  async initialize(httpServer: Server): Promise<void> {
    // Configurar plugin para graceful shutdown
    this.server = new ApolloServer<GraphQLContext>({
      typeDefs,
      resolvers,
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        // Plugin personalizado para logging
        {
          async requestDidStart() {
            return {
              async didResolveOperation(requestContext) {
                Logger.info('GraphQL Operation:', {
                  operationName: requestContext.request.operationName,
                  query: requestContext.request.query?.slice(0, 200) + (requestContext.request.query?.length! > 200 ? '...' : '')
                });
              },
              async didEncounterErrors(requestContext) {
                Logger.error('GraphQL Errors:', {
                  errors: requestContext.errors.map(error => ({
                    message: error.message,
                    path: error.path,
                    locations: error.locations
                  }))
                });
              }
            };
          }
        }
      ]
    });

    await this.server.start();
    Logger.success('GraphQL Server initialized successfully');
  }

  createContext(req: Request, res: Response): GraphQLContext {
    const requestId = uuidv4();
    const userAgent = req.get('User-Agent');
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';

    Logger.info('GraphQL Request Context:', {
      requestId,
      userAgent,
      clientIp,
      serviceDiscoveryEnabled: !!this.serviceDiscovery
    });

    return {
      serviceDiscovery: this.serviceDiscovery,
      proxyService: this.proxyService,
      requestId,
      userAgent,
      clientIp
    };
  }

  getServer(): ApolloServer<GraphQLContext> {
    return this.server;
  }

  async stop(): Promise<void> {
    await this.server.stop();
    Logger.info('GraphQL Server stopped');
  }
}
