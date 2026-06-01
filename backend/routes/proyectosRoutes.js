import express from 'express';
import {
  getProyectos,
  getProyectoDetalle,
  createProyecto,
  updateProyecto,
  deleteProyecto,
} from '../controllers/proyectosController.js';

const router = express.Router();

router.get('/', getProyectos);
router.get('/:id', getProyectoDetalle);
router.post('/', createProyecto);
router.put('/:id', updateProyecto);
router.delete('/:id', deleteProyecto);

export default router;