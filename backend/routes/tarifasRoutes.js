import express from 'express';
import { getTarifas, createTarifa, updateTarifa, deleteTarifa } from '../controllers/tarifasController.js';
const router = express.Router();

router.get('/', getTarifas);
router.post('/', createTarifa);
router.put('/:id', updateTarifa);
router.delete('/:id', deleteTarifa);

export default router;
