import express from 'express';
import { getTipoCambioActual } from '../controllers/tipoCambioController.js';

const router = express.Router();

router.get('/actual', getTipoCambioActual);

export default router;