export const services = {
  'cultivo-manager': {
    base_url: 'http://localhost:8080',
    port: 8080,
    description: 'Spring Boot - Gestión de Cultivos',
    endpoints: [
      '/api/usuarios',
      '/api/cultivos',
      '/api/sensores',
      '/api/riegos',
      '/api/zonas',
    ],
  },
  'clima-service': {
    base_url: 'http://localhost:3000',
    port: 3000,
    description: 'Node.js - Servicio de Clima',
    endpoints: [
      '/api/auth/login',
      '/api/consulta-clima',
      '/api/fuentes',
      '/api/logs',
    ],
  },
  'plaga-detection': {
    base_url: 'http://localhost:8000',
    port: 8000,
    description: 'Laravel - Detección de Plagas',
    endpoints: [
      '/api/login',
      '/api/register',
      '/api/logout',
      '/api/notificaciones',
      '/api/deteccion',
      '/api/captura',
    ],
  },
  'sensor-service': {
    base_url: 'http://localhost:6060',
    port: 6060,
    description: 'FastAPI - Servicio de Sensores',
    endpoints: [
      '/api/v1/sensores',
      '/api/v1/readings',
      '/api/v1/ubicaciones',
      '/api/v1/anomalias',
      '/api/v1/predicciones',
    ],
  },
  'export-module': {
    base_url: 'http://localhost:5197',
    port: 5197,
    description: '.NET - Módulo de Exportación',
    endpoints: [
      '/api/auth/login',
      '/api/evaluacion/:cultivoId',
      '/api/exportacion',
      '/api/exportacion/:id',
      '/api/consulta/ejecutar',
    ],
  },
  'ia-evaluacion': {
    base_url: 'http://localhost:3200',
    port: 3200,
    description: 'FastAPI - Evaluación con IA',
    endpoints: [
      '/chat',
      '/evaluar-cultivo',
    ],
  },
  'vision-detection': {
    base_url: 'http://localhost:5000',
    port: 5000,
    description: 'Flask - Detección de Imágenes con YOLO',
    endpoints: [
      '/',
      '/detect',
    ],
  },
} as const;

/**
 * Mapea una ruta del gateway al servicio correspondiente
 * @param path - Ruta del request (ej: "/cultivo/api/usuarios")
 * @returns Información del servicio o null si no se encuentra
 */
export function getServiceByPath(path: string): { name: string; service: typeof services[keyof typeof services] } | null {
  const pathSegments = path.split('/').filter(Boolean);
  if (pathSegments.length === 0) return null;

  const serviceRoute = pathSegments[0];
  
  const serviceMap: Record<string, keyof typeof services> = {
    'cultivo': 'cultivo-manager',
    'clima': 'clima-service',
    'plaga': 'plaga-detection',
    'sensor': 'sensor-service',
    'export': 'export-module',
    'ia': 'ia-evaluacion',
    'vision': 'vision-detection'
  };

  const serviceName = serviceMap[serviceRoute];
  if (serviceName && services[serviceName]) {
    return {
      name: serviceName,
      service: services[serviceName]
    };
  }

  return null;
}

/**
 * Obtiene información de todos los servicios registrados
 */
export function getAllServices() {
  return Object.entries(services).map(([name, config]) => ({
    name,
    ...config
  }));
}
