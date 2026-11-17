import { ORDER_PRIORITY, ORDER_STATUS } from '../constants/index.js';
import {
  OrderNotFoundError,
  UserNotFoundError,
  MissingFieldsError,
  InvalidPriorityError,
  RequestValidationError,
} from '../errors/index.js';
import {
  assertValidId,
  assertNonNegative,
  findMissingFields,
  parsePagination,
  toNumber,
} from '../utils/validators.js';
import { noopLogger } from '../utils/noop.logger.js';

const validPriorities = Object.values(ORDER_PRIORITY);

function parseItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new RequestValidationError([{ field: 'items', message: 'debe ser un array con al menos un item' }]);
  }
  return items.map((item, index) => {
    const missing = findMissingFields(item, ['name', 'quantity', 'unitPrice']);
    if (missing.length) throw new MissingFieldsError(missing.map((f) => `items[${index}].${f}`));

    const quantity = toNumber(`items[${index}].quantity`, item.quantity);
    const unitPrice = toNumber(`items[${index}].unitPrice`, item.unitPrice);
    assertNonNegative(`items[${index}].unitPrice`, unitPrice);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new RequestValidationError([
        { field: `items[${index}].quantity`, message: 'debe ser un entero de al menos 1' },
      ]);
    }
    return { name: item.name, quantity, unitPrice };
  });
}

export class OrderService {
  constructor(orderRepository, userRepository, logger = noopLogger) {
    this.orderRepository = orderRepository;
    this.userRepository = userRepository;
    this.logger = logger;
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

  async create(data = {}) {
    const missing = findMissingFields(data, ['customer', 'items', 'shippingAddress']);
    if (missing.length) throw new MissingFieldsError(missing);

    assertValidId(data.customer);
    const customer = await this.userRepository.getById(data.customer);
    if (!customer) throw new UserNotFoundError(data.customer);

    const items = parseItems(data.items);

    const missingAddress = findMissingFields(data.shippingAddress, ['street', 'city']);
    if (missingAddress.length) {
      throw new MissingFieldsError(missingAddress.map((f) => `shippingAddress.${f}`));
    }

    const priority = data.priority ?? ORDER_PRIORITY.NORMAL;
    if (!validPriorities.includes(priority)) throw new InvalidPriorityError(priority, validPriorities);

    const order = await this.orderRepository.create({
      customer: data.customer,
      items,
      total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
      status: ORDER_STATUS.PENDING,
      priority,
      shippingAddress: { street: data.shippingAddress.street, city: data.shippingAddress.city },
    });

    this.logger.info(`Pedido creado: ${order._id} (cliente ${data.customer}, prioridad ${priority})`);
    return order;
  }
}
