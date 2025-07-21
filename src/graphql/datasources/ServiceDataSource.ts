import fetch from 'node-fetch';
import { Logger } from '../../utils/logger';
import { ServiceDiscoveryService } from '../../services/ServiceDiscoveryService';

export class ServiceDataSource {
  private serviceDiscovery?: ServiceDiscoveryService;
  private baseTimeout: number = 5000;

  constructor(serviceDiscovery?: ServiceDiscoveryService) {
    this.serviceDiscovery = serviceDiscovery;
  }

  async makeRequest(
    serviceName: string, 
    path: string, 
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: any;
      timeout?: number;
    } = {}
  ): Promise<any> {
    const { method = 'GET', headers = {}, body, timeout = this.baseTimeout } = options;

    try {
      // Intentar obtener la URL del Service Discovery primero
      let serviceUrl: string | null = null;
      
      if (this.serviceDiscovery) {
        serviceUrl = await this.serviceDiscovery.getServiceUrl(serviceName);
      }

      // Si no hay Service Discovery o no se encontró el servicio, usar configuración estática
      if (!serviceUrl) {
        serviceUrl = this.getStaticServiceUrl(serviceName);
      }

      if (!serviceUrl) {
        throw new Error(`Service ${serviceName} not found`);
      }

      const url = `${serviceUrl}${path}`;
      
      Logger.info(`Making request to ${serviceName}`, {
        url,
        method,
        path
      });

      const requestOptions: any = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-By': 'API-Gateway',
          ...headers
        }
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        Logger.warn(`Service ${serviceName} returned error`, {
          status: response.status,
          statusText: response.statusText,
          url
        });
        
        throw new Error(`Service error: ${response.status} ${response.statusText}`);
      }

      Logger.info(`Successful request to ${serviceName}`, {
        status: response.status,
        url
      });

      return responseData;

    } catch (error) {
      Logger.error(`Error calling service ${serviceName}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        path,
        method
      });
      
      throw error;
    }
  }

  private getStaticServiceUrl(serviceName: string): string | null {
    // Mapeo estático para servicios conocidos
    const serviceMap: Record<string, string> = {
      'auth': 'http://localhost:5000',
      'authentication': 'http://localhost:5000',
      'Authentication Service': 'http://localhost:5000',
      'admissions': 'http://localhost:5001',
      'Admissions Service': 'http://localhost:5001'
    };

    return serviceMap[serviceName] || null;
  }

  // Métodos específicos para cada servicio
  async getUsers(): Promise<any[]> {
    return this.makeRequest('auth', '/users');
  }

  async getUser(id: string): Promise<any> {
    return this.makeRequest('auth', `/users/${id}`);
  }

  async authenticateUser(email: string, password: string): Promise<any> {
    return this.makeRequest('auth', '/login', {
      method: 'POST',
      body: { email, password }
    });
  }

  async registerUser(userData: any): Promise<any> {
    return this.makeRequest('auth', '/register', {
      method: 'POST',
      body: userData
    });
  }

  async getStudents(): Promise<any[]> {
    return this.makeRequest('admissions', '/students');
  }

  async getStudent(id: string): Promise<any> {
    return this.makeRequest('admissions', `/students/${id}`);
  }

  async getApplications(): Promise<any[]> {
    return this.makeRequest('admissions', '/applications');
  }

  async getApplication(id: string): Promise<any> {
    return this.makeRequest('admissions', `/applications/${id}`);
  }

  async createApplication(applicationData: any): Promise<any> {
    return this.makeRequest('admissions', '/applications', {
      method: 'POST',
      body: applicationData
    });
  }

  async updateApplication(id: string, updateData: any): Promise<any> {
    return this.makeRequest('admissions', `/applications/${id}`, {
      method: 'PUT',
      body: updateData
    });
  }
}
