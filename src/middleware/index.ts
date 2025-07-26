import { Request, Response, NextFunction } from 'express';
import { ProxyRequest } from '../types';
import { Logger } from '../utils/logger';

export const requestLogger = (req: ProxyRequest, res: Response, next: NextFunction): void => {
  req.proxyStartTime = Date.now();
  
  const originalSend = res.send;
  res.send = function(body: any) {
    const endTime = Date.now();
    const duration = endTime - (req.proxyStartTime || endTime);
    
    Logger.info(
      `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`,
      {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        service: req.serviceName
      }
    );
    
    return originalSend.call(this, body);
  };
  
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  Logger.error(`Error processing request ${req.method} ${req.originalUrl}:`, {
    error: err.message,
    stack: err.stack,
    ip: req.ip
  });

  // No enviar información sensible en producción
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      ...(isDevelopment && { stack: err.stack })
    }
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  Logger.warn(`Route not found: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  });
};

export const corsHeaders = (req: Request, res: Response, next: NextFunction): void => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};
