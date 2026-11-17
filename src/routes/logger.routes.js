import { Router } from 'express';
import * as controller from '../controllers/logger.controller.js';

const router = Router();

router.get('/test', controller.testLogger);

export default router;
