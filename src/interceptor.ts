import { Request, Response, NextFunction } from 'express';
import { wsManager } from './websocket';

interface InterceptedRequest extends Request {
  interceptId?: string;
  startTime?: number;
}

/**
 * Middleware para interceptar y enviar todas las requests por WebSocket
 */
export function interceptorMiddleware(req: InterceptedRequest, res: Response, next: NextFunction) {
  req.startTime = Date.now();
  
  // Capturar datos de la request
  const originalUrl = req.originalUrl;
  const method = req.method;
  const headers = { ...req.headers } as Record<string, string>;
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Identificar módulo de origen si está disponible
  const sourceModule = req.get('x-source-module') || 
                      req.get('x-service-name') || 
                      req.get('x-origin-service') ||
                      identifySourceFromUserAgent(req.get('User-Agent') || '');

  // Identificar servicio de destino basado en la ruta
  const targetService = identifyTargetService(originalUrl);

  // Capturar el body si está disponible
  let body = undefined;
  if (req.body && Object.keys(req.body).length > 0) {
    try {
      body = JSON.parse(JSON.stringify(req.body));
    } catch (error) {
      // Si hay error parseando el body, lo dejamos como undefined
      body = undefined;
    }
  }

  // Interceptar la request
  const requestId = wsManager.interceptRequest(
    method,
    originalUrl,
    headers,
    body,
    sourceModule,
    targetService,
    clientIP
  );
  
  req.interceptId = requestId;

  // Interceptar la response
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  // Variable para evitar interceptar múltiples veces
  let responseIntercepted = false;

  res.send = function(body?: any) {
    if (!responseIntercepted) {
      interceptResponse(req, res, body);
      responseIntercepted = true;
    }
    return originalSend.call(this, body);
  };

  res.json = function(obj: any) {
    if (!responseIntercepted) {
      interceptResponse(req, res, obj);
      responseIntercepted = true;
    }
    return originalJson.call(this, obj);
  };

  res.end = function(chunk?: any, encoding?: any) {
    if (!responseIntercepted && chunk && !res.headersSent) {
      interceptResponse(req, res, chunk);
      responseIntercepted = true;
    }
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

/**
 * Función auxiliar para interceptar la response
 */
function interceptResponse(req: InterceptedRequest, res: Response, body?: any) {
  if (!req.interceptId || res.headersSent) return;

  const responseTime = req.startTime ? Date.now() - req.startTime : 0;
  const statusCode = res.statusCode;
  const headers = { ...res.getHeaders() } as Record<string, string>;
  
  // Calcular tamaño aproximado
  let size = 0;
  if (body) {
    try {
      if (typeof body === 'string') {
        size = Buffer.byteLength(body, 'utf8');
      } else if (typeof body === 'object') {
        size = Buffer.byteLength(JSON.stringify(body), 'utf8');
      }
    } catch (error) {
      size = 0;
    }
  }

  // Procesar el body para enviarlo
  let processedBody;
  if (body) {
    try {
      if (typeof body === 'string') {
        // Intentar parsear como JSON si es posible
        try {
          processedBody = JSON.parse(body);
        } catch {
          processedBody = body.length > 1000 ? body.substring(0, 1000) + '...' : body;
        }
      } else {
        processedBody = body;
      }
    } catch (error) {
      processedBody = 'Error procesando response body';
    }
  }

  wsManager.interceptResponse(
    req.interceptId,
    statusCode,
    headers,
    processedBody,
    responseTime,
    size
  );
}

/**
 * Middleware para interceptar errores
 */
export function errorInterceptorMiddleware(error: any, req: InterceptedRequest, res: Response, next: NextFunction) {
  if (req.interceptId) {
    wsManager.interceptError(req.interceptId, error);
  }
  
  console.error('❌ Error interceptado:', {
    url: req.originalUrl,
    method: req.method,
    error: error.message,
    stack: error.stack
  });
  
  next(error);
}

/**
 * Identifica el módulo de origen basándose en el User-Agent
 */
function identifySourceFromUserAgent(userAgent: string): string | undefined {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('postman')) return 'Postman';
  if (ua.includes('insomnia')) return 'Insomnia';
  if (ua.includes('curl')) return 'cURL';
  if (ua.includes('axios')) return 'Axios Client';
  if (ua.includes('node')) return 'Node.js Client';
  if (ua.includes('python')) return 'Python Client';
  if (ua.includes('java')) return 'Java Client';
  if (ua.includes('chrome')) return 'Chrome Browser';
  if (ua.includes('firefox')) return 'Firefox Browser';
  if (ua.includes('safari')) return 'Safari Browser';
  
  return undefined;
}

/**
 * Identifica el servicio de destino basándose en la ruta
 */
function identifyTargetService(url: string): string | undefined {
  const pathSegments = url.split('/').filter(Boolean);
  if (pathSegments.length === 0) return undefined;

  const serviceRoute = pathSegments[0];
  
  const serviceMap: Record<string, string> = {
    'cultivo': 'cultivo-manager',
    'clima': 'clima-service',
    'plaga': 'plaga-detection',
    'sensor': 'sensor-service',
    'export': 'export-module',
    'ia': 'ia-evaluacion',
    'vision': 'vision-detection',
    'graphql': 'GraphQL Gateway',
    'gateway': 'API Gateway Info'
  };

  return serviceMap[serviceRoute];
}
