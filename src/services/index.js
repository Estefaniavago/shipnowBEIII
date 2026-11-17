// Composition root: acá se "cablean" las dependencias (Service <- Repository).
import bcrypt from 'bcryptjs';
import productRepository from '../repositories/product.repository.js';
import userRepository from '../repositories/user.repository.js';
import orderRepository from '../repositories/order.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import { ProductService } from './product.service.js';
import { UserService } from './user.service.js';
import { OrderService } from './order.service.js';
import { MockService } from './mock.service.js';

const HASH_ROUNDS = 10;

export const productService = new ProductService(productRepository);
export const userService = new UserService(userRepository);
export const orderService = new OrderService(orderRepository);
export const mockService = new MockService({
  userRepository,
  orderRepository,
  deliveryRepository,
  hashPassword: (plain) => bcrypt.hash(plain, HASH_ROUNDS),
});
