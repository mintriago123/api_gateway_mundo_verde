import express, { Express, Request, Response } from "express";
import { ClientRequest, IncomingMessage, ServerResponse } from "http";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { verifyJWT } from "./auth";
import { services, getServiceByPath } from "./config";

/**
 * Middleware para identificar y loggear información del módulo que maneja la petición
 */
function moduleIdentifierMiddleware(req: Request, res: Response, next: any) {
  const serviceInfo = getServiceByPath(req.path);
  
  if (serviceInfo) {
    const timestamp = new Date().toISOString();
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    console.log(`
╭─────────────────────────────────────────────────────────────╮
│ 🚀 PETICIÓN AL API GATEWAY                                  │
├─────────────────────────────────────────────────────────────┤
│ 📅 Timestamp: ${timestamp}                   │
│ 🌐 IP Cliente: ${clientIP.padEnd(15)}                           │
│ 📡 Método: ${req.method.padEnd(6)} │ 🛣️  Ruta: ${req.originalUrl.padEnd(25)} │
├─────────────────────────────────────────────────────────────┤
│ 🏷️  MÓDULO DESTINO:                                          │
│   📦 Nombre: ${serviceInfo.name.padEnd(20)}                      │
│   📝 Descripción: ${serviceInfo.service.description.padEnd(30)}    │
│   🔌 Puerto: ${serviceInfo.service.port.toString().padEnd(6)}                                │
│   🎯 URL Base: ${serviceInfo.service.base_url.padEnd(25)}         │
╰─────────────────────────────────────────────────────────────╯
    `);
    
    // Agregar información del servicio al request para uso posterior
    (req as any).serviceInfo = serviceInfo;
  } else {
    console.log(`⚠️  [${new Date().toISOString()}] Petición a ruta no reconocida: ${req.method} ${req.originalUrl}`);
  }
  
  next();
}

/**
 * Registra en la instancia de Express todos los proxys del API Gateway.
 */
export function registerRoutes(app: Express): void {
  // Aplicar el middleware de identificación de módulos a todas las rutas
  app.use(moduleIdentifierMiddleware);

  /* ════════════════════
     RUTA DE INFORMACIÓN DEL GATEWAY
  ══════════════════════ */
  app.get("/gateway/info", (req: Request, res: Response) => {
    const allServices = Object.entries(services).map(([name, config]) => ({
      nombre: name,
      descripcion: config.description,
      puerto: config.port,
      baseUrl: config.base_url,
      endpoints: config.endpoints,
      rutaGateway: name.includes('cultivo') ? '/cultivo' : 
                   name.includes('clima') ? '/clima' :
                   name.includes('plaga') ? '/plaga' :
                   name.includes('sensor') ? '/sensor' :
                   name.includes('export') ? '/export' :
                   name.includes('ia') ? '/ia' : 'unknown'
    }));

    res.json({
      mensaje: "Información de módulos del API Gateway Mundo Verde",
      timestamp: new Date().toISOString(),
      gatewayPort: process.env.GATEWAY_PORT || 4000,
      totalModulos: allServices.length,
      modulos: allServices
    });
  });

  app.get("/gateway/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      gateway: {
        port: process.env.GATEWAY_PORT || 4000,
        version: "1.0.0"
      },
      modules: Object.entries(services).map(([name, config]) => ({
        name,
        port: config.port,
        baseUrl: config.base_url
      }))
    });
  });

  /* ════════════════════
     CULTIVO-MANAGER
     (Spring Boot) – todo protegido
  ══════════════════════ */
  app.use(
    "/cultivo",
    verifyJWT,
    createProxyMiddleware({
      target: services["cultivo-manager"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/cultivo": "" },
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [CULTIVO-MANAGER:${services["cultivo-manager"].port}] Enviando: ${req.method} ${req.originalUrl} → ${services["cultivo-manager"].base_url}${req.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [CULTIVO-MANAGER:${services["cultivo-manager"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [CULTIVO-MANAGER:${services["cultivo-manager"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* ════════════════════
     CLIMA-SERVICE
     (Node.js) – login público, resto privado
  ══════════════════════ */
  app.use(
    "/clima",
    (req: Request, res: Response, next) => {
      // Solo exige JWT si NO es /api/auth/login
      if (!req.path.startsWith("/api/auth/login")) {
        return verifyJWT(req, res, next);
      }
      next();
    },
    createProxyMiddleware({
      target: services["clima-service"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/clima": "" }, // → /api/auth/login, /consulta-clima, etc.
      logLevel: "debug",
      onProxyReq(proxyReq: ClientRequest, r: Request) {
        console.log(`🔄 [CLIMA-SERVICE:${services["clima-service"].port}] Enviando: ${r.method} ${r.originalUrl} → ${services["clima-service"].base_url}${r.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [CLIMA-SERVICE:${services["clima-service"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, _req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [CLIMA-SERVICE:${services["clima-service"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* ════════════════════
     PLA​GA-DETECTION
     (Laravel) – login y register públicos
  ══════════════════════ */
  /* ─── Login y Register ─────────────────────────────── */
  app.post(
    "/plaga/login",
    createProxyMiddleware({
      target: services["plaga-detection"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/plaga/login": "/api/login" }, // 👈 convierte a /api/login
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [PLAGA-DETECTION:${services["plaga-detection"].port}] Login: ${req.method} ${req.originalUrl} → ${services["plaga-detection"].base_url}/api/login`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [PLAGA-DETECTION:${services["plaga-detection"].port}] Login respuesta: ${proxyRes.statusCode}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [PLAGA-DETECTION:${services["plaga-detection"].port}] Login error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  app.post(
    "/plaga/register",
    createProxyMiddleware({
      target: services["plaga-detection"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/plaga/register": "/api/register" }, // /api/register
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [PLAGA-DETECTION:${services["plaga-detection"].port}] Register: ${req.method} ${req.originalUrl} → ${services["plaga-detection"].base_url}/api/register`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [PLAGA-DETECTION:${services["plaga-detection"].port}] Register respuesta: ${proxyRes.statusCode}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [PLAGA-DETECTION:${services["plaga-detection"].port}] Register error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* ─── Rutas protegidas ─────────────────────────────── */
  app.use(
    "/plaga",
    verifyJWT,
    createProxyMiddleware({
      target: services["plaga-detection"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/plaga": "" }, // /plaga/api/... → /api/...
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [PLAGA-DETECTION:${services["plaga-detection"].port}] Enviando: ${req.method} ${req.originalUrl} → ${services["plaga-detection"].base_url}${req.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [PLAGA-DETECTION:${services["plaga-detection"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [PLAGA-DETECTION:${services["plaga-detection"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* ═════════ SENSOR-SERVICE (FastAPI) ═════════ */

  /* 1. Login público ─ sin verifyJWT */
  app.post(
    "/sensor/auth/login",
    createProxyMiddleware({
      target: services["sensor-service"].base_url, // http://localhost:6060
      changeOrigin: true,
      // si la ruta real es /auth/login deja así;
      // si fuese /api/auth/login, ajusta:
      // pathRewrite: { '^/sensor/auth/login': '/api/auth/login' },
      pathRewrite: { "^/sensor/auth/login": "/auth/login" },
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [SENSOR-SERVICE:${services["sensor-service"].port}] Login: ${req.method} ${req.originalUrl} → ${services["sensor-service"].base_url}/auth/login`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [SENSOR-SERVICE:${services["sensor-service"].port}] Login respuesta: ${proxyRes.statusCode}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [SENSOR-SERVICE:${services["sensor-service"].port}] Login error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* 2. Resto de rutas: protegidas */
  app.use(
    "/sensor",
    verifyJWT, // ← aquí sí validas token
    createProxyMiddleware({
      target: services["sensor-service"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/sensor": "" }, // /sensor/api/v1/... → /api/v1/...
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [SENSOR-SERVICE:${services["sensor-service"].port}] Enviando: ${req.method} ${req.originalUrl} → ${services["sensor-service"].base_url}${req.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [SENSOR-SERVICE:${services["sensor-service"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [SENSOR-SERVICE:${services["sensor-service"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* ════════════════════
     EXPORT-MODULE
     (.NET) – login público
  ══════════════════════ */
  app.post(
    "/export/auth/login",
    createProxyMiddleware({
      target: services["export-module"].base_url, // http://localhost:5197
      changeOrigin: true,
      pathRewrite: { "^/export/auth/login": "/api/Auth/login" }, // ← respeta mayúsculas si tu .NET las usa
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [EXPORT-MODULE:${services["export-module"].port}] Login: ${req.method} ${req.originalUrl} → ${services["export-module"].base_url}/api/Auth/login`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [EXPORT-MODULE:${services["export-module"].port}] Login respuesta: ${proxyRes.statusCode}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [EXPORT-MODULE:${services["export-module"].port}] Login error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );
  app.use(
    "/export",
    verifyJWT,
    createProxyMiddleware({
      target: services["export-module"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/export": "" },
      onProxyReq(proxyReq: ClientRequest, req: Request) {
        console.log(`🔄 [EXPORT-MODULE:${services["export-module"].port}] Enviando: ${req.method} ${req.originalUrl} → ${services["export-module"].base_url}${req.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [EXPORT-MODULE:${services["export-module"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [EXPORT-MODULE:${services["export-module"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* ════════════════════
     IA-EVALUACION
     (FastAPI) – protegido con JWT
  ══════════════════════ */
  app.use(
    "/ia",
    // verifyJWT,
    createProxyMiddleware({
      target: services["ia-evaluacion"].base_url, // http://localhost:3200
      changeOrigin: true,
      pathRewrite: { "^/ia": "" }, // /ia/chat → /chat, /ia/evaluar-cultivo → /evaluar-cultivo
      logLevel: "debug",
      onProxyReq(proxyReq: ClientRequest, r: Request) {
        console.log(`🔄 [IA-EVALUACION:${services["ia-evaluacion"].port}] Enviando: ${r.method} ${r.originalUrl} → ${services["ia-evaluacion"].base_url}${r.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        console.log(`✅ [IA-EVALUACION:${services["ia-evaluacion"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, _req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [IA-EVALUACION:${services["ia-evaluacion"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );
}
