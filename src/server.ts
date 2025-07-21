import dotenv from 'dotenv';
dotenv.config();

import { ApiGateway } from './services/ApiGateway';
import { Logger } from './utils/logger';

// Verificar variables de entorno críticas
const requiredEnvVars = ['PORT'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  Logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Crear e iniciar el API Gateway
try {
  const gateway = new ApiGateway();
  gateway.start();
} catch (error) {
  Logger.error('Failed to start API Gateway:', error);
  process.exit(1);
}