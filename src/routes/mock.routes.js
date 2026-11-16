import { Router } from 'express';
import * as controller from '../controllers/mock.controller.js';

const router = Router();

// Datos simulados: NO se guardan en la base
router.get('/users', controller.getUsers);
router.get('/couriers', controller.getCouriers);
router.get('/orders', controller.getOrders);
router.get('/deliveries', controller.getDeliveries);
router.get('/dataset', controller.getDataset);

// Carga de datos de prueba en MongoDB
router.post('/seed', controller.seed);
router.delete('/seed', controller.clear);

export default router;
