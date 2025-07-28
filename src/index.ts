import express from "express";
import dotenv from "dotenv";
import { mountGraphQL } from "./graphql";
import { registerRoutes } from "./routes";
import { getAllServices } from "./config";

(async () => {
  dotenv.config();

  const app = express();

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                   🌱 API GATEWAY MUNDO VERDE                 ║
  ║                     Iniciando servidor...                    ║
  ╚══════════════════════════════════════════════════════════════╝
  `);

  /* 1. GraphQL */
  await mountGraphQL(app);

  /* 2. Proxys REST */
  registerRoutes(app);

  const port = process.env.GATEWAY_PORT || 4000;
  
  const allServices = getAllServices();
  
  app.listen(port, () => {
    console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║ ✅ API Gateway MUNDO VERDE ejecutándose en puerto ${port}        ║
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
  ╚══════════════════════════════════════════════════════════════╝
    `);
  });
})();
