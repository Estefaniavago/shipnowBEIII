// Composition root: acá se "cablean" las dependencias (Service <- Repository).
import productRepository from '../repositories/product.repository.js';
import userRepository from '../repositories/user.repository.js';
import { ProductService } from './product.service.js';
import { UserService } from './user.service.js';

export const productService = new ProductService(productRepository);
export const userService = new UserService(userRepository);
