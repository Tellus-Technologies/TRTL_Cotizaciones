import express from 'express';
import { getModulos, createModulo, updateModulo, deleteModulo } from '../controllers/modulosController.js';
const router = express.Router();

router.get('/', getModulos);
router.post('/', createModulo);
router.put('/:id', updateModulo);
router.delete('/:id', deleteModulo);

export default router;
