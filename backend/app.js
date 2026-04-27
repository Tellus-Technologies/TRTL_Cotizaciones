import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import clientesRoutes from './routes/clientesRoutes.js';
import modulosRoutes from './routes/modulosRoutes.js';
import tarifasRoutes from './routes/tarifasRoutes.js';
import proyectosRoutes from './routes/proyectosRoutes.js';
import tipoCambioRoutes from './routes/tipoCambioRoutes.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));

app.use(express.json());

app.use('/api/clientes', clientesRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/tarifas', tarifasRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/tipo-cambio', tipoCambioRoutes);


export default app;

/*import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import clientesRoutes from './routes/clientesRoutes.js';
import modulosRoutes from './routes/modulosRoutes.js';
import tarifasRoutes from './routes/tarifasRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/clientes', clientesRoutes);
app.use('/api/modulos', modulosRoutes);
app.use('/api/tarifas', tarifasRoutes);

export default app;
*/