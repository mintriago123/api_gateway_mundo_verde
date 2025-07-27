import { Express, Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { verifyJWT } from './auth';
import { services } from './config';
import { ClientRequest, IncomingMessage, ServerResponse } from 'http';

// Este método recibe la app de express y registra todas las rutas/proxy
export function registerRoutes(app: Express) {
  // ====== CultivoManager (requiere JWT en todas sus rutas) ======
  app.use('/cultivo', verifyJWT, createProxyMiddleware({
    target: services['cultivo-manager'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/cultivo': '' },
  }));

  // ====== Clima MundoVerde ======
  // --- Rutas públicas (sin JWT): LOGIN ---
  app.use(
    '/clima/api/auth/login',
    (req: Request, res: Response, next) => {
      console.log('Request recibido en /clima/api/auth/login');
      console.log('URL original:', req.url);
      console.log('Path:', req.path);
      next();
    },
    createProxyMiddleware({
      target: services['clima-service'].base_url,
      changeOrigin: true,
      pathRewrite: { '^/clima/api': '/api' },
      onProxyReq: (proxyReq: ClientRequest, req: Request, res: Response) => {
        console.log('Enviando petición al microservicio de clima');
        console.log('Target URL:', services['clima-service'].base_url + req.url.replace('/clima/api', '/api'));
      },
      onError: (err: Error, req: IncomingMessage, res: ServerResponse) => {
        console.error('Error en el proxy:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Proxy error');
      },
    } as Options)
  );

  // --- Rutas privadas (con JWT): Consulta Clima, Fuentes, Logs ---
  app.use('/clima/api/consulta-clima', verifyJWT, createProxyMiddleware({
    target: services['clima-service'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/clima/api': '/api' },
  }));

  app.use('/clima/api/fuentes', verifyJWT, createProxyMiddleware({
    target: services['clima-service'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/clima/api': '/api' },
  }));

  app.use('/clima/api/logs', verifyJWT, createProxyMiddleware({
    target: services['clima-service'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/clima/api': '/api' },
  }));

  // --- Otras rutas de clima (sin JWT) ---
  app.use('/clima', createProxyMiddleware({
    target: services['clima-service'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/clima': '' },
  }));

  // ====== Proyecto PlaGA ======
  // --- Rutas públicas ---
  app.use('/plaga/login', createProxyMiddleware({
    target: services['plaga-detection'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/plaga': '' },
  }));
  app.use('/plaga/register', createProxyMiddleware({
    target: services['plaga-detection'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/plaga': '' },
  }));
  // --- Rutas privadas ---
  app.use('/plaga', verifyJWT, createProxyMiddleware({
    target: services['plaga-detection'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/plaga': '' },
  }));

  // ====== Modulo Sensor (requiere JWT en todo) ======
  app.use('/sensor', verifyJWT, createProxyMiddleware({
    target: services['sensor-service'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/sensor': '' },
  }));

  // ====== Export Trace Module (.NET) ======
  // --- Login sin JWT ---
  app.use('/export/auth/login', createProxyMiddleware({
    target: services['export-module'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/export': '' },
  }));
  // --- El resto con JWT ---
  app.use('/export', verifyJWT, createProxyMiddleware({
    target: services['export-module'].base_url,
    changeOrigin: true,
    pathRewrite: { '^/export': '' },
  }));
}
