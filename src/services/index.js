// Composition root: acá se "cablean" las dependencias (Service <- Repository, Logger).
import bcrypt from 'bcryptjs';
import logger from '../config/logger.js';
import productRepository from '../repositories/product.repository.js';
import userRepository from '../repositories/user.repository.js';
import orderRepository from '../repositories/order.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import { ProductService } from './product.service.js';
import { UserService } from './user.service.js';
import { OrderService } from './order.service.js';
import { MockService } from './mock.service.js';
import { LogService } from './log.service.js';

const HASH_ROUNDS = 10;

export const productService = new ProductService(productRepository, logger);
export const userService = new UserService(userRepository, logger);
export const orderService = new OrderService(orderRepository, userRepository, logger);
export const logService = new LogService(logger);
export const mockService = new MockService({
  userRepository,
  orderRepository,
  deliveryRepository,
  hashPassword: (plain) => bcrypt.hash(plain, HASH_ROUNDS),
  logger,
});
