import { Router } from 'express';
import * as controller from '../controllers/delivery.controller.js';
import { uploadDeliveryReceipt } from '../config/upload.config.js';

const router = Router();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.post('/:id/receipts', uploadDeliveryReceipt, controller.uploadReceipt);

export default router;
