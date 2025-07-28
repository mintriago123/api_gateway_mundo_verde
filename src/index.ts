import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import { mountGraphQL } from "./graphql";
import { registerRoutes } from "./routes";
import { getAllServices } from "./config";
import { wsManager } from "./websocket";
import { interceptorMiddleware, errorInterceptorMiddleware } from "./interceptor";

(async () => {
  dotenv.config();

  const app = express();
  const server = createServer(app);

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                   🌱 API GATEWAY MUNDO VERDE                 ║
  ║                     Iniciando servidor...                    ║
  ╚══════════════════════════════════════════════════════════════╝
  `);

  // Middlewares básicos - CORS primero
  app.use(cors());
  
  // Configuración especial para GraphQL - NO aplicar body-parser
  app.use('/graphql', (req, res, next) => {
    // Apollo Server manejará su propio parsing del body
    next();
  });
  
  // Para todas las demás rutas (REST), aplicar body-parser e interceptor
  app.use((req: any, res, next) => {
    if (req.path === '/graphql' || req.originalUrl.includes('/graphql')) {
      // Saltamos el body-parser y el interceptor para GraphQL
      next();
    } else {
      // Para rutas REST, aplicamos body parsers
      bodyParser.json({ limit: '10mb' })(req, res, (err: any) => {
        if (err) return next(err);
        bodyParser.urlencoded({ extended: true, limit: '10mb' })(req, res, (err: any) => {
          if (err) return next(err);
          // Aplicamos el interceptor después del body-parser
          interceptorMiddleware(req, res, next);
        });
      });
    }
  });

  /* 1. GraphQL - Se monta ANTES de las rutas REST */
  await mountGraphQL(app);

  /* 2. Proxys REST */
  registerRoutes(app);

  // Middleware específico para manejar errores de GraphQL
  app.use('/graphql', (err: any, req: any, res: any, next: any) => {
    console.error('❌ Error en GraphQL middleware:', {
      url: req.originalUrl,
      method: req.method,
      error: err.message,
      stack: err.stack
    });
    
    if (err.message === 'stream is not readable') {
      return res.status(400).json({
        errors: [{
          message: 'Error de parsing del request. Asegúrate de enviar un JSON válido.',
          extensions: {
            code: 'BAD_REQUEST'
          }
        }]
      });
    }
    
    next(err);
  });

  // Ruta para obtener estadísticas de WebSocket
  app.get('/gateway/websocket/stats', (req, res) => {
    res.json(wsManager.getStats());
  });

  // Middleware de manejo de errores - DEBE ir al final
  app.use(errorInterceptorMiddleware);

  const port = process.env.GATEWAY_PORT || 4000;
  const wsPort = process.env.WEBSOCKET_PORT || port;
  
  const allServices = getAllServices();
  
  server.listen(port, () => {
    // Inicializar WebSocket Server
    wsManager.initialize(server, Number(wsPort));
    
    console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║ ✅ API Gateway MUNDO VERDE ejecutándose en puerto ${port}        ║
  ║ 📡 WebSocket Server ejecutándose en puerto ${wsPort}            ║
  ╠══════════════════════════════════════════════════════════════╣
  ║ 📊 MÓDULOS REGISTRADOS:                                      ║`);
    
    allServices.forEach(service => {
      console.log(`  ║ 🔌 ${service.name.padEnd(15)} | Puerto: ${service.port.toString().padEnd(4)} | ${service.description.padEnd(25)} ║`);
    });
    
    console.log(`  ╠══════════════════════════════════════════════════════════════╣
  ║ 🔗 RUTAS ÚTILES:                                            ║
  ║ 📋 Info módulos: http://localhost:${port}/gateway/info            ║
  ║ 💚 Health check: http://localhost:${port}/gateway/health          ║
  ║ 🚀 GraphQL:      http://localhost:${port}/graphql                ║
  ║ 📊 WS Stats:     http://localhost:${port}/gateway/websocket/stats ║
  ║ �️  WS Client:    http://localhost:${port}/gateway/websocket/client║
  ║ �📡 WebSocket:    ws://localhost:${wsPort}                        ║
  ╚══════════════════════════════════════════════════════════════╝
    `);
  });
})();
