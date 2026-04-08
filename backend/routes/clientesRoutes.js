import express from 'express';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../controllers/clientesController.js';
const router = express.Router();

router.get('/', getClientes);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);

export default router;
