import express, { Express, Request, Response } from "express";
import { ClientRequest, IncomingMessage, ServerResponse } from "http";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { verifyJWT } from "./auth";
import { services } from "./config";

/**
 * Registra en la instancia de Express todos los proxys del API Gateway.
 */
export function registerRoutes(app: Express): void {
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
    })
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
        console.log(`[Proxy→Clima] ${r.method} ${r.originalUrl}`);
      },
      onError(err: Error, _req: IncomingMessage, res: ServerResponse) {
        console.error("[Proxy-error Clima]", err.message);
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
    })
  );

  app.post(
    "/plaga/register",
    createProxyMiddleware({
      target: services["plaga-detection"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/plaga/register": "/api/register" }, // /api/register
    })
  );

  /* ─── Rutas protegidas ─────────────────────────────── */
  app.use(
    "/plaga",
    verifyJWT,
    createProxyMiddleware({
      target: services["plaga-detection"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/plaga": "" }, // /plaga/api/... → /api/...
    })
  );

  /* ═════════ SENSOR-SERVICE (FastAPI) ═════════ */

  /* 1. Login público ─ sin verifyJWT */
  app.post(
    "/sensor/auth/login",
    createProxyMiddleware({
      target: services["sensor-service"].base_url, // http://localhost:7000
      changeOrigin: true,
      // si la ruta real es /auth/login deja así;
      // si fuese /api/auth/login, ajusta:
      // pathRewrite: { '^/sensor/auth/login': '/api/auth/login' },
      pathRewrite: { "^/sensor/auth/login": "/auth/login" },
    })
  );

  /* 2. Resto de rutas: protegidas */
  app.use(
    "/sensor",
    verifyJWT, // ← aquí sí validas token
    createProxyMiddleware({
      target: services["sensor-service"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/sensor": "" }, // /sensor/api/v1/... → /api/v1/...
    })
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
    })
  );
  app.use(
    "/export",
    verifyJWT,
    createProxyMiddleware({
      target: services["export-module"].base_url,
      changeOrigin: true,
      pathRewrite: { "^/export": "" },
    })
  );
}
