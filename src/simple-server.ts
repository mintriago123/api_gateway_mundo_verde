import dotenv from 'dotenv';
dotenv.config();

import { SimpleApiGateway } from './services/SimpleApiGateway';
import { Logger } from './utils/logger';

// Crear e iniciar el API Gateway simple
try {
  const gateway = new SimpleApiGateway();
  gateway.start();
} catch (error) {
  Logger.error('Failed to start Simple API Gateway:', error);
  process.exit(1);
}
