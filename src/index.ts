import express from 'express';
import dotenv from 'dotenv';
import { registerRoutes } from './routes';

dotenv.config();

const app = express();

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

registerRoutes(app);

const port = process.env.GATEWAY_PORT || 4000;
app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
});
