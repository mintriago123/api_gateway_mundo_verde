import express, { Express } from 'express';
import cors from 'cors';
import config from '../config';
import { Logger } from '../utils/logger';

export class SimpleApiGateway {
  private app: Express;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(cors());
  }

  private setupRoutes(): void {
    // Simple health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Test routes
    this.app.get('/auth/*', (req, res) => {
      res.json({ service: 'auth', path: req.path, message: 'Auth service proxy would go here' });
    });

    this.app.get('/admissions/*', (req, res) => {
      res.json({ service: 'admissions', path: req.path, message: 'Admissions service proxy would go here' });
    });
  }

  public start(): void {
    this.app.listen(config.port, () => {
      Logger.success(`Simple API Gateway is running on port ${config.port}`);
    });
  }

  public getApp(): Express {
    return this.app;
  }
}
