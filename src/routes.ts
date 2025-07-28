import express, { Express, Request, Response } from "express";
import { ClientRequest, IncomingMessage, ServerResponse } from "http";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { verifyJWT } from "./auth";
import { services, getServiceByPath } from "./config";
import path from "path";

/**
 * Identifica el módulo de origen basándose en headers, IP, user-agent, puerto, etc.
 */
function identifySourceModule(req: Request): { name: string; evidence: string } | null {
  const userAgent = req.get('User-Agent') || '';
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const referer = req.get('Referer') || '';
  const xForwardedFor = req.get('X-Forwarded-For') || '';
  const xRealIP = req.get('X-Real-IP') || '';
  const host = req.get('Host') || '';
  
  // Obtener puerto de la conexión si está disponible
  const connection = (req as any).connection || (req as any).socket;
  const remotePort = connection?.remotePort;
  const localPort = connection?.localPort;
  
  const customHeaders = {
    'x-source-module': req.get('x-source-module'),
    'x-service-name': req.get('x-service-name'),
    'x-origin-service': req.get('x-origin-service'),
    'x-source-port': req.get('x-source-port'),
  };

  // 1. Headers personalizados (más confiable)
  if (customHeaders['x-source-module']) {
    return { name: customHeaders['x-source-module'], evidence: 'Header x-source-module' };
  }
  if (customHeaders['x-service-name']) {
    return { name: customHeaders['x-service-name'], evidence: 'Header x-service-name' };
  }
  if (customHeaders['x-origin-service']) {
    return { name: customHeaders['x-origin-service'], evidence: 'Header x-origin-service' };
  }

  // 2. Detección por puerto explícito en header
  if (customHeaders['x-source-port']) {
    const sourcePort = parseInt(customHeaders['x-source-port']);
    const moduleByPort = getModuleByPort(sourcePort);
    if (moduleByPort) {
      return { name: moduleByPort, evidence: `Header x-source-port: ${sourcePort}` };
    }
  }

  // 3. Análisis de puerto remoto de la conexión
  if (remotePort) {
    const moduleByPort = getModuleByPort(remotePort);
    if (moduleByPort) {
      return { name: moduleByPort, evidence: `Puerto remoto de conexión: ${remotePort}` };
    }
  }

  // 4. Análisis de User-Agent para detectar servicios conocidos
  if (userAgent.includes('java') || userAgent.includes('Apache-HttpClient') || userAgent.includes('okhttp')) {
    return { name: 'cultivo-manager', evidence: 'User-Agent (Java/Spring Boot)' };
  }
  if (userAgent.includes('node') || userAgent.includes('axios') || userAgent.includes('fetch')) {
    return { name: 'clima-service', evidence: 'User-Agent (Node.js)' };
  }
  if (userAgent.includes('PHP') || userAgent.includes('GuzzleHttp') || userAgent.includes('curl')) {
    return { name: 'plaga-detection', evidence: 'User-Agent (PHP/Laravel)' };
  }
  if (userAgent.includes('python') || userAgent.includes('requests') || userAgent.includes('httpx') || userAgent.includes('FastAPI') || userAgent.includes('Flask')) {
    // Distinguir entre sensor-service, ia-evaluacion y vision-detection por puerto si es posible
    if (clientIP.includes('6060') || referer.includes('6060') || remotePort === 6060) {
      return { name: 'sensor-service', evidence: 'User-Agent (Python/FastAPI) + Puerto 6060' };
    } else if (clientIP.includes('3200') || referer.includes('3200') || remotePort === 3200) {
      return { name: 'ia-evaluacion', evidence: 'User-Agent (Python/FastAPI) + Puerto 3200' };
    } else if (clientIP.includes('5000') || referer.includes('5000') || remotePort === 5000) {
      return { name: 'vision-detection', evidence: 'User-Agent (Python/Flask) + Puerto 5000' };
    }
    return { name: 'python-service', evidence: 'User-Agent (Python/FastAPI/Flask)' };
  }
  if (userAgent.includes('.NET') || userAgent.includes('HttpClient')) {
    return { name: 'export-module', evidence: 'User-Agent (.NET)' };
  }

  // 5. Análisis de IP/Puerto origen en headers X-Forwarded-For
  const forwardedPorts = xForwardedFor.match(/:(\d+)/g);
  if (forwardedPorts) {
    const ports = forwardedPorts.map(p => parseInt(p.replace(':', '')));
    for (const port of ports) {
      const moduleByPort = getModuleByPort(port);
      if (moduleByPort) {
        return { name: moduleByPort, evidence: `X-Forwarded-For puerto ${port}` };
      }
    }
  }

  // 6. Análisis de puerto en X-Real-IP
  if (xRealIP.includes(':')) {
    const portMatch = xRealIP.match(/:(\d+)$/);
    if (portMatch) {
      const port = parseInt(portMatch[1]);
      const moduleByPort = getModuleByPort(port);
      if (moduleByPort) {
        return { name: moduleByPort, evidence: `X-Real-IP puerto ${port}` };
      }
    }
  }

  // 7. Análisis de Referer
  if (referer.includes(':8080')) return { name: 'cultivo-manager', evidence: 'Referer puerto 8080' };
  if (referer.includes(':3000')) return { name: 'clima-service', evidence: 'Referer puerto 3000' };
  if (referer.includes(':8000')) return { name: 'plaga-detection', evidence: 'Referer puerto 8000' };
  if (referer.includes(':6060')) return { name: 'sensor-service', evidence: 'Referer puerto 6060' };
  if (referer.includes(':5197')) return { name: 'export-module', evidence: 'Referer puerto 5197' };
  if (referer.includes(':3200')) return { name: 'ia-evaluacion', evidence: 'Referer puerto 3200' };
  if (referer.includes(':5000')) return { name: 'vision-detection', evidence: 'Referer puerto 5000' };

  // 8. Cliente web (navegador)
  if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari') || userAgent.includes('Firefox')) {
    return { name: 'web-browser', evidence: 'User-Agent (Navegador Web)' };
  }

  // 9. Herramientas de testing
  if (userAgent.includes('Postman')) return { name: 'postman', evidence: 'User-Agent (Postman)' };
  if (userAgent.includes('curl')) return { name: 'curl', evidence: 'User-Agent (cURL)' };
  if (userAgent.includes('Insomnia')) return { name: 'insomnia', evidence: 'User-Agent (Insomnia)' };

  return null;
}

/**
 * Función auxiliar para mapear puertos a módulos
 */
function getModuleByPort(port: number): string | null {
  const portToModuleMap: Record<number, string> = {
    8080: 'cultivo-manager',
    3000: 'clima-service',
    8000: 'plaga-detection', 
    6060: 'sensor-service',
    5197: 'export-module',
    3200: 'ia-evaluacion',
    5000: 'vision-detection'
  };
  
  return portToModuleMap[port] || null;
}

/**
 * Middleware para identificar y loggear información del módulo que maneja la petición
 */
function moduleIdentifierMiddleware(req: Request, res: Response, next: any) {
  const serviceInfo = getServiceByPath(req.path);
  const sourceModule = identifySourceModule(req);
  
  // Información adicional de conexión
  const connection = (req as any).connection || (req as any).socket;
  const remotePort = connection?.remotePort || 'unknown';
  const localPort = connection?.localPort || 'unknown';
  const xForwardedFor = req.get('X-Forwarded-For') || '';
  
  if (serviceInfo) {
    const timestamp = new Date().toISOString();
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    console.log(`
╭─────────────────────────────────────────────────────────────╮
│ 🚀 PETICIÓN AL API GATEWAY                                  │
├─────────────────────────────────────────────────────────────┤
│ 📅 Timestamp: ${timestamp}                   │
│ 🌐 IP Cliente: ${clientIP.padEnd(15)} │ 🔌 Puerto remoto: ${remotePort.toString().padEnd(6)}  │
│ 📡 Método: ${req.method.padEnd(6)} │ 🛣️  Ruta: ${req.originalUrl.padEnd(25)} │
│ 🔗 X-Forwarded-For: ${xForwardedFor.padEnd(30)}                    │
├─────────────────────────────────────────────────────────────┤
│ 📤 MÓDULO ORIGEN:                                           │
│   🏷️  Módulo: ${(sourceModule?.name || 'desconocido').padEnd(20)}                │
│   🔍 Evidencia: ${(sourceModule?.evidence || 'no detectada').padEnd(30)}         │
├─────────────────────────────────────────────────────────────┤
│ 📥 MÓDULO DESTINO:                                          │
│   📦 Nombre: ${serviceInfo.name.padEnd(20)}                      │
│   📝 Descripción: ${serviceInfo.service.description.padEnd(30)}    │
│   🔌 Puerto: ${serviceInfo.service.port.toString().padEnd(6)}                                │
│   🎯 URL Base: ${serviceInfo.service.base_url.padEnd(25)}         │
╰─────────────────────────────────────────────────────────────╯
    `);
    
    // Agregar información del servicio al request para uso posterior
    (req as any).serviceInfo = serviceInfo;
    (req as any).sourceModule = sourceModule;
  } else {
    const sourceModule = identifySourceModule(req);
    console.log(`⚠️  [${new Date().toISOString()}] Petición a ruta no reconocida: ${req.method} ${req.originalUrl} 
    📤 Origen: ${sourceModule?.name || 'desconocido'} (${sourceModule?.evidence || 'no detectado'})
    🔌 Puerto remoto: ${remotePort}`);
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
                   name.includes('ia') ? '/ia' :
                   name.includes('vision') ? '/vision' : 'unknown'
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

  // Nueva ruta para servir el cliente WebSocket
  app.get("/gateway/websocket/client", (req: Request, res: Response) => {
    const clientPath = path.resolve(__dirname, "..", "cliente-websocket.html");
    res.sendFile(clientPath);
  });

  // Nueva ruta para mostrar guía de identificación de módulos origen
  app.get("/gateway/modules/detection", (req: Request, res: Response) => {
    res.json({
      mensaje: "Guía de detección de módulos origen",
      timestamp: new Date().toISOString(),
      metodos_deteccion: {
        "headers_personalizados": {
          descripcion: "Headers HTTP personalizados (más confiable)",
          headers: [
            "x-source-module: nombre-del-modulo",
            "x-service-name: nombre-del-servicio", 
            "x-origin-service: servicio-origen",
            "x-source-port: puerto-del-servicio-origen"
          ],
          ejemplo: "curl -H 'x-source-module: clima-service' -H 'x-source-port: 3000' http://localhost:4000/cultivo/api/usuarios"
        },
        "puerto_conexion": {
          descripcion: "Detección automática por puerto de conexión TCP (MUY CONFIABLE)",
          nota: "El gateway detecta automáticamente el puerto remoto de la conexión TCP",
          mapeo_puertos: {
            "8080": "cultivo-manager (Spring Boot)",
            "3000": "clima-service (Node.js)", 
            "8000": "plaga-detection (Laravel)",
            "6060": "sensor-service (FastAPI)",
            "5197": "export-module (.NET)",
            "3200": "ia-evaluacion (FastAPI)",
            "5000": "vision-detection (Flask)"
          },
          ejemplo: "Si un servicio en puerto 8080 hace una petición, se detecta automáticamente como 'cultivo-manager'"
        },
        "user_agent": {
          descripcion: "Análisis del User-Agent para detectar tecnología",
          patrones: {
            "java|Apache-HttpClient|okhttp": "cultivo-manager (Spring Boot)",
            "node|axios|fetch": "clima-service (Node.js)",
            "PHP|GuzzleHttp|curl": "plaga-detection (Laravel)",
            "python|requests|httpx|FastAPI|Flask": "sensor-service, ia-evaluacion o vision-detection (Python)",
            ".NET|HttpClient": "export-module (.NET)",
            "Mozilla|Chrome|Safari|Firefox": "web-browser",
            "Postman": "postman",
            "Insomnia": "insomnia"
          }
        },
        "headers_proxy": {
          descripcion: "Detección por puerto en headers de proxy (X-Forwarded-For, X-Real-IP)",
          nota: "Útil cuando hay proxies o load balancers intermedios",
          headers_analizados: [
            "X-Forwarded-For: contiene IP:puerto",
            "X-Real-IP: contiene IP:puerto", 
            "Referer: contiene URL con puerto"
          ]
        }
      },
      prioridad_deteccion: [
        "1. Headers personalizados (x-source-module, x-service-name, etc.)",
        "2. Header x-source-port específico",
        "3. Puerto remoto de conexión TCP",
        "4. Análisis de User-Agent", 
        "5. Headers de proxy (X-Forwarded-For, X-Real-IP)",
        "6. Análisis de Referer"
      ],
      recomendacion: "Para máxima precisión, configura tus servicios para incluir 'x-source-module' y 'x-source-port' en todas las peticiones al gateway"
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
        const sourceInfo = (req as any).sourceModule;
        const sourceText = sourceInfo ? `${sourceInfo.name} (${sourceInfo.evidence})` : 'desconocido';
        console.log(`🔄 [${sourceText} → CULTIVO-MANAGER:${services["cultivo-manager"].port}] Enviando: ${req.method} ${req.originalUrl} → ${services["cultivo-manager"].base_url}${req.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        const sourceInfo = (req as any).sourceModule;
        const sourceText = sourceInfo ? sourceInfo.name : 'desconocido';
        console.log(`✅ [${sourceText} → CULTIVO-MANAGER:${services["cultivo-manager"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
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
        const sourceInfo = (r as any).sourceModule;
        const sourceText = sourceInfo ? `${sourceInfo.name} (${sourceInfo.evidence})` : 'desconocido';
        console.log(`🔄 [${sourceText} → CLIMA-SERVICE:${services["clima-service"].port}] Enviando: ${r.method} ${r.originalUrl} → ${services["clima-service"].base_url}${r.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        const sourceInfo = (req as any).sourceModule;
        const sourceText = sourceInfo ? sourceInfo.name : 'desconocido';
        console.log(`✅ [${sourceText} → CLIMA-SERVICE:${services["clima-service"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
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
        const sourceInfo = (r as any).sourceModule;
        const sourceText = sourceInfo ? `${sourceInfo.name} (${sourceInfo.evidence})` : 'desconocido';
        console.log(`🔄 [${sourceText} → IA-EVALUACION:${services["ia-evaluacion"].port}] Enviando: ${r.method} ${r.originalUrl} → ${services["ia-evaluacion"].base_url}${r.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        const sourceInfo = (req as any).sourceModule;
        const sourceText = sourceInfo ? sourceInfo.name : 'desconocido';
        console.log(`✅ [${sourceText} → IA-EVALUACION:${services["ia-evaluacion"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, _req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [IA-EVALUACION:${services["ia-evaluacion"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );

  /* ════════════════════
     VISION-DETECTION
     (Flask) – detección de imágenes con YOLO
  ══════════════════════ */
  app.use(
    "/vision",
    // Sin autenticación JWT por ahora, pero se puede agregar si es necesario
    createProxyMiddleware({
      target: services["vision-detection"].base_url, // http://localhost:5000
      changeOrigin: true,
      pathRewrite: { "^/vision": "" }, // /vision/detect → /detect, /vision/ → /
      onProxyReq(proxyReq: ClientRequest, r: Request) {
        const sourceInfo = (r as any).sourceModule;
        const sourceText = sourceInfo ? `${sourceInfo.name} (${sourceInfo.evidence})` : 'desconocido';
        console.log(`🔄 [${sourceText} → VISION-DETECTION:${services["vision-detection"].port}] Enviando: ${r.method} ${r.originalUrl} → ${services["vision-detection"].base_url}${r.url}`);
      },
      onProxyRes(proxyRes: IncomingMessage, req: Request) {
        const sourceInfo = (req as any).sourceModule;
        const sourceText = sourceInfo ? sourceInfo.name : 'desconocido';
        console.log(`✅ [${sourceText} → VISION-DETECTION:${services["vision-detection"].port}] Respuesta: ${proxyRes.statusCode} para ${req.method} ${req.originalUrl}`);
      },
      onError(err: Error, _req: IncomingMessage, res: ServerResponse) {
        console.error(`❌ [VISION-DETECTION:${services["vision-detection"].port}] Error:`, err.message);
        res.writeHead(502).end("Gateway error");
      },
    } as Options)
  );
}
