import { GraphQLContext } from '../types';
import { ServiceDataSource } from '../datasources/ServiceDataSource';
import { Logger } from '../../utils/logger';

export const mutationResolvers = {
  // Service Discovery Mutations
  registerService: async (parent: any, { input }: { input: any }, context: GraphQLContext) => {
    try {
      if (!context.serviceDiscovery) {
        throw new Error('Service Discovery is not enabled');
      }

      const serviceInfo = {
        name: input.name,
        host: input.host,
        port: input.port,
        protocol: input.protocol || 'http',
        version: input.version || '1.0.0',
        metadata: input.metadata || {},
        tags: [...(input.tags || []), 'graphql-registered']
      };

      const service = await context.serviceDiscovery.registerService(serviceInfo);

      Logger.info(`Service registered via GraphQL: ${input.name}`, {
        endpoint: `${serviceInfo.protocol}://${serviceInfo.host}:${serviceInfo.port}`,
        registeredBy: 'graphql'
      });

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
      Logger.error('Error registering service via GraphQL:', error);
      throw new Error('Failed to register service');
    }
  },

  deregisterService: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
    try {
      if (!context.serviceDiscovery) {
        throw new Error('Service Discovery is not enabled');
      }

      const success = await context.serviceDiscovery.deregisterService(id);
      
      if (success) {
        Logger.info(`Service deregistered via GraphQL: ${id}`);
      }

      return success;
    } catch (error) {
      Logger.error(`Error deregistering service ${id} via GraphQL:`, error);
      throw new Error('Failed to deregister service');
    }
  },

  // Auth Service Mutations (delegadas)
  login: async (parent: any, { email, password }: { email: string; password: string }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      const result = await dataSource.authenticateUser(email, password);
      
      return {
        token: result.token || 'dummy-jwt-token',
        user: result.user || { id: '1', email, name: 'Test User', role: 'USER', active: true, createdAt: new Date() },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      };
    } catch (error) {
      Logger.error('Login error:', error);
      throw new Error('Authentication failed');
    }
  },

  register: async (parent: any, { input }: { input: any }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      const result = await dataSource.registerUser(input);
      
      return {
        token: result.token || 'dummy-jwt-token',
        user: result.user || { 
          id: Date.now().toString(), 
          email: input.email, 
          name: input.name, 
          role: input.role || 'USER', 
          active: true, 
          createdAt: new Date() 
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      Logger.error('Registration error:', error);
      throw new Error('Registration failed');
    }
  },

  updateProfile: async (parent: any, { input }: { input: any }, context: GraphQLContext) => {
    try {
      // Esto requeriría autenticación y obtener el ID del usuario actual
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      
      // Por ahora, simular actualización exitosa
      return {
        id: '1',
        email: input.email || 'test@example.com',
        name: input.name || 'Updated User',
        role: 'USER',
        active: true,
        createdAt: new Date()
      };
    } catch (error) {
      Logger.error('Profile update error:', error);
      throw new Error('Failed to update profile');
    }
  },

  // Admissions Service Mutations (delegadas)
  createApplication: async (parent: any, { input }: { input: any }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      const result = await dataSource.createApplication(input);
      
      return result || {
        id: Date.now().toString(),
        student: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'PENDING',
          createdAt: new Date()
        },
        program: input.program,
        academicYear: input.academicYear,
        status: 'DRAFT',
        submittedAt: new Date(),
        documents: []
      };
    } catch (error) {
      Logger.error('Create application error:', error);
      throw new Error('Failed to create application');
    }
  },

  updateApplication: async (parent: any, { id, input }: { id: string; input: any }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      const result = await dataSource.updateApplication(id, input);
      
      return result || {
        id,
        student: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'PENDING',
          createdAt: new Date()
        },
        program: input.program || 'Computer Science',
        academicYear: input.academicYear || '2025',
        status: 'DRAFT',
        submittedAt: new Date(),
        documents: []
      };
    } catch (error) {
      Logger.error(`Update application ${id} error:`, error);
      throw new Error('Failed to update application');
    }
  },

  submitApplication: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
    try {
      const dataSource = new ServiceDataSource(context.serviceDiscovery);
      
      // Simular envío de aplicación
      return {
        id,
        student: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'PENDING',
          createdAt: new Date()
        },
        program: 'Computer Science',
        academicYear: '2025',
        status: 'SUBMITTED',
        submittedAt: new Date(),
        documents: []
      };
    } catch (error) {
      Logger.error(`Submit application ${id} error:`, error);
      throw new Error('Failed to submit application');
    }
  },

  reviewApplication: async (parent: any, { id, status, notes }: { id: string; status: string; notes?: string }, context: GraphQLContext) => {
    try {
      // Esta función sería para administradores
      return {
        id,
        student: {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          status: 'PENDING',
          createdAt: new Date()
        },
        program: 'Computer Science',
        academicYear: '2025',
        status: status as any,
        submittedAt: new Date(),
        reviewedAt: new Date(),
        documents: []
      };
    } catch (error) {
      Logger.error(`Review application ${id} error:`, error);
      throw new Error('Failed to review application');
    }
  },

  uploadDocument: async (parent: any, { applicationId, file, type }: { applicationId: string; file: any; type: string }, context: GraphQLContext) => {
    try {
      // El file upload requeriría configuración adicional
      Logger.info(`Document upload requested for application ${applicationId}`, { type });
      
      return {
        id: Date.now().toString(),
        name: 'document.pdf',
        type: type as any,
        url: `https://example.com/documents/${Date.now()}.pdf`,
        uploadedAt: new Date()
      };
    } catch (error) {
      Logger.error(`Upload document error for application ${applicationId}:`, error);
      throw new Error('Failed to upload document');
    }
  }
};
