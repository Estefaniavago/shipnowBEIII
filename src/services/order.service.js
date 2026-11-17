import { OrderNotFoundError } from '../errors/index.js';
import { assertValidId, parsePagination } from '../utils/validators.js';

export class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async getAll({ page, limit } = {}) {
    return this.orderRepository.getAll(parsePagination({ page, limit }));
  }

  async getById(id) {
    assertValidId(id);
    const order = await this.orderRepository.getById(id);
    if (!order) throw new OrderNotFoundError(id);
    return order;
  }
}
