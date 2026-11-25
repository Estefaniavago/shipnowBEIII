import { Router } from 'express';
import productRoutes from './product.routes.js';
import userRoutes from './user.routes.js';
import orderRoutes from './order.routes.js';
import deliveryRoutes from './delivery.routes.js';
import healthRoutes from './health.routes.js';
import loggerRoutes from './logger.routes.js';
import mockRoutes from './mock.routes.js';

// internalEndpoints: mocks y logger test. En producción quedan apagados por defecto
// (ver ENABLE_INTERNAL_ENDPOINTS en config); una ruta apagada responde 404 ROUTE_NOT_FOUND.
export function buildRoutes({ internalEndpoints = true } = {}) {
  const router = Router();

  router.use('/health', healthRoutes);
  router.use('/products', productRoutes);
  router.use('/users', userRoutes);
  router.use('/orders', orderRoutes);
  router.use('/deliveries', deliveryRoutes);

  if (internalEndpoints) {
    router.use('/logger', loggerRoutes);
    router.use('/mocks', mockRoutes);
  }
  return router;
}
