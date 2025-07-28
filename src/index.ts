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

  // Middlewares básicos
  app.use(cors());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
  
  // Middleware de interceptación - DEBE ir antes que las rutas pero después de body parsers
  // Excluimos GraphQL completamente del interceptor para evitar conflictos con Apollo
  app.use((req: any, res, next) => {
    if (req.originalUrl.includes('/graphql')) {
      // Para GraphQL, no interceptamos nada, dejamos que Apollo lo maneje
      next();
    } else {
      interceptorMiddleware(req, res, next);
    }
  });

  /* 1. GraphQL */
  await mountGraphQL(app);

  /* 2. Proxys REST */
  registerRoutes(app);

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
