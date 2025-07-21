import { GraphQLContext } from '../types';
import { ServiceDataSource } from '../datasources/ServiceDataSource';
import { Logger } from '../../utils/logger';
import { formatDuration } from '../../utils/logger';

const startTime = Date.now();

export const queryResolvers = {
  // Gateway y Service Discovery
  gatewayStats: async (parent: any, args: any, context: GraphQLContext) => {
    try {
      const services = context.serviceDiscovery 
        ? await context.serviceDiscovery.getAllServices()
        : [];
      
      const serviceStatuses = context.proxyService.getServiceStatus();
      
      const healthyServices = services.filter(s => s.healthy).length;
      const unhealthyServices = services.length - healthyServices;
      
      // Agrupar servicios por nombre
      const serviceGroups = services.reduce((acc: any, service) => {
        if (!acc[service.name]) {
          acc[service.name] = { name: service.name, instances: 0, healthy: 0, unhealthy: 0 };
        }
        acc[service.name].instances++;
        if (service.healthy) {
          acc[service.name].healthy++;
        } else {
          acc[service.name].unhealthy++;
        }
        return acc;
      }, {});

      return {
        totalServices: services.length,
        healthyServices,
        unhealthyServices,
        uptime: formatDuration(Date.now() - startTime),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        serviceGroups: Object.values(serviceGroups)
      };
    } catch (error) {
      Logger.error('Error getting gateway stats:', error);
      throw new Error('Failed to get gateway statistics');
    }
  },

  services: async (parent: any, args: any, context: GraphQLContext) => {
    try {
      if (!context.serviceDiscovery) {
        throw new Error('Service Discovery is not enabled');
      }

      const services = await context.serviceDiscovery.getAllServices();
      
      return services.map(service => ({
        id: service.id,
        name: service.name,
        endpoint: `${service.protocol}://${service.host}:${service.port}`,
        version: service.version,
        status: service.healthy ? 'HEALTHY' : 'UNHEALTHY',
        lastSeen: service.lastHeartbeat,
        metadata: service.metadata,
        tags: service.tags || [],
        registeredAt: service.registeredAt
      }));
    } catch (error) {
      Logger.error('Error getting services:', error);
      throw new Error('Failed to get services');
    }
  },

  service: async (parent: any, { name }: { name: string }, context: GraphQLContext) => {
    try {
      if (!context.serviceDiscovery) {
        throw new Error('Service Discovery is not enabled');
      }

      const services = await context.serviceDiscovery.discoverServices(name);
      
      return services.map(service => ({
        id: service.id,
        name: service.name,
        endpoint: `${service.protocol}://${service.host}:${service.port}`,
        version: service.version,
        status: service.healthy ? 'HEALTHY' : 'UNHEALTHY',
        lastSeen: service.lastHeartbeat,
        metadata: service.metadata,
        tags: service.tags || [],
        registeredAt: service.registeredAt
      }));
    } catch (error) {
      Logger.error(`Error getting service ${name}:`, error);
      throw new Error(`Failed to get service ${name}`);
    }
  },

  serviceById: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
    try {
      if (!context.serviceDiscovery) {
        throw new Error('Service Discovery is not enabled');
      }

      const services = await context.serviceDiscovery.getAllServices();
      const service = services.find(s => s.id === id);
      
      if (!service) {
        return null;
      }

      return {
        id: service.id,
        name: service.name,
        endpoint: `${service.protocol}://${service.host}:${service.port}`,
        version: service.version,
        status: service.healthy ? 'HEALTHY' : 'UNHEALTHY',
        lastSeen: service.lastHeartbeat,
        metadata: service.metadata,
        tags: service.tags || [],
        registeredAt: service.registeredAt
      };
    } catch (error) {
      Logger.error(`Error getting service by ID ${id}:`, error);
      throw new Error(`Failed to get service by ID`);
    }
  },

  // Proxy request genérico
  proxyRequest: async (parent: any, { request }: { request: any }, context: GraphQLContext) => {
    const startTime = Date.now();
    
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      
      const result = await dataSource.makeRequest(
        request.serviceName,
        request.path,
        {
          method: request.method,
          headers: request.headers,
          body: request.body
        }
      );

      const responseTime = Date.now() - startTime;

      return {
        statusCode: 200,
        data: result,
        error: null,
        responseTime,
        service: request.serviceName,
        timestamp: new Date()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      Logger.error(`Proxy request failed for ${request.serviceName}:`, error);
      
      return {
        statusCode: 500,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        service: request.serviceName,
        timestamp: new Date()
      };
    }
  },

  // Auth Service Queries (delegadas)
  me: async (parent: any, args: any, context: GraphQLContext) => {
    try {
      // Este endpoint requeriría autenticación
      // Por ahora, retornamos null o un usuario de ejemplo
      return null;
    } catch (error) {
      Logger.error('Error getting current user:', error);
      throw new Error('Failed to get current user');
    }
  },

  users: async (parent: any, args: any, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      return await dataSource.getUsers();
    } catch (error) {
      Logger.error('Error getting users:', error);
      // Retornar lista vacía en lugar de error para mejor UX
      return [];
    }
  },

  user: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      return await dataSource.getUser(id);
    } catch (error) {
      Logger.error(`Error getting user ${id}:`, error);
      return null;
    }
  },

  // Admissions Service Queries (delegadas)
  students: async (parent: any, args: any, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      return await dataSource.getStudents();
    } catch (error) {
      Logger.error('Error getting students:', error);
      return [];
    }
  },

  student: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      return await dataSource.getStudent(id);
    } catch (error) {
      Logger.error(`Error getting student ${id}:`, error);
      return null;
    }
  },

  applications: async (parent: any, args: any, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      return await dataSource.getApplications();
    } catch (error) {
      Logger.error('Error getting applications:', error);
      return [];
    }
  },

  application: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      return await dataSource.getApplication(id);
    } catch (error) {
      Logger.error(`Error getting application ${id}:`, error);
      return null;
    }
  },

  myApplications: async (parent: any, args: any, context: GraphQLContext) => {
    try {
      // Esto requeriría autenticación para obtener el ID del usuario actual
      // Por ahora retornamos todas las aplicaciones
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      return await dataSource.getApplications();
    } catch (error) {
      Logger.error('Error getting my applications:', error);
      return [];
    }
  }
};
