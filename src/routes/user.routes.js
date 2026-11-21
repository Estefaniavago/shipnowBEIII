import { Router } from 'express';
import * as controller from '../controllers/user.controller.js';
import { uploadUserDocument } from '../config/upload.config.js';

const router = Router();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.post('/:id/documents', uploadUserDocument, controller.uploadDocument);
router.delete('/:id', controller.remove);

export default router;
