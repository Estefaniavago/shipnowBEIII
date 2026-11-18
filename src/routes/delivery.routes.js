import { Router } from 'express';
import * as controller from '../controllers/delivery.controller.js';

const router = Router();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.patch('/:id', controller.update);

export default router;
