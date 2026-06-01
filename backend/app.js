import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import clientesRoutes from './routes/clientesRoutes.js';
import modulosRoutes from './routes/modulosRoutes.js';
import tarifasRoutes from './routes/tarifasRoutes.js';
import proyectosRoutes from './routes/proyectosRoutes.js';
import tipoCambioRoutes from './routes/tipoCambioRoutes.js';

dotenv.config();

const app = express();

/* ============================
   CORS
============================ */

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

/* ============================
   API
============================ */

app.use('/api/clientes', clientesRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/tarifas', tarifasRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/tipo-cambio', tipoCambioRoutes);

/* ============================
   FRONTEND EN PRODUCCIÓN
============================ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, '..', 'dist');

app.use(express.static(frontendPath));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  res.sendFile(path.join(frontendPath, 'index.html'));
});

export default app;