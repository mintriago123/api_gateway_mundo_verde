export const services = {
  'cultivo-manager': {
    base_url: 'http://localhost:8080',
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
    endpoints: [
      '/api/auth/login',
      '/api/consulta-clima',
      '/api/fuentes',
      '/api/logs',
    ],
  },
  'plaga-detection': {
    base_url: 'http://localhost:8000',
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
    endpoints: [
      '/chat',
      '/evaluar-cultivo',
    ],
  },
} as const;
