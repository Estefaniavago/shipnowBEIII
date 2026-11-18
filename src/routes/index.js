import { Router } from 'express';
import productRoutes from './product.routes.js';
import userRoutes from './user.routes.js';
import orderRoutes from './order.routes.js';
import deliveryRoutes from './delivery.routes.js';
import loggerRoutes from './logger.routes.js';
import mockRoutes from './mock.routes.js';

const router = Router();

router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);
router.use('/deliveries', deliveryRoutes);
router.use('/logger', loggerRoutes);
router.use('/mocks', mockRoutes);

export default router;
