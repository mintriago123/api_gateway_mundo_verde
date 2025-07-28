import express from "express";
import dotenv from "dotenv";
import { mountGraphQL } from "./graphql";
import { registerRoutes } from "./routes";

(async () => {
  dotenv.config();

  const app = express();

  /* 1. GraphQL */
  await mountGraphQL(app);

  /* 2. Proxys REST */
  registerRoutes(app);

  const port = process.env.GATEWAY_PORT || 4000;
  app.listen(port, () => {
    console.log(`API Gateway listening on port ${port}`);
  });
})();
