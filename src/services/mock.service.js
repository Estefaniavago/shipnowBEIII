import {
  USER_ROLES,
  ORDER_TO_DELIVERY_STATUS,
  MOCK,
  MOCK_TYPES,
  MOCK_COLLECTIONS,
} from '../constants/index.js';
import {
  InvalidMockQuantityError,
  InvalidMockTypeError,
  MockDependencyMissingError,
  MockSeedError,
  QTY_REASONS,
} from '../errors/index.js';
import {
  generateUsers,
  generateOrder,
  generateDelivery,
  canHaveDelivery,
  pick,
} from '../utils/mock.generator.js';

import { noopLogger } from '../utils/noop.logger.js';

const DELIVERY_ORDER_STATUSES = Object.keys(ORDER_TO_DELIVERY_STATUS);

export class MockService {
  constructor({ userRepository, orderRepository, deliveryRepository, hashPassword, logger = noopLogger }) {
    this.logger = logger;
    this.userRepository = userRepository;
    this.orderRepository = orderRepository;
    this.deliveryRepository = deliveryRepository;
    this.hashPassword = hashPassword;
  }

  // ---------- Datos simulados (NO se guardan) ----------

  getUsers(qty) {
    const amount = this.#parseQty(qty);
    this.logger.debug(`Generando ${amount} usuarios simulados (sin guardar)`);
    return generateUsers(amount, { role: USER_ROLES.USER });
  }

  getCouriers(qty) {
    const amount = this.#parseQty(qty);
    this.logger.debug(`Generando ${amount} repartidores simulados (sin guardar)`);
    return generateUsers(amount, { role: USER_ROLES.COURIER });
  }

  getOrders(qty) {
    const amount = this.#parseQty(qty);
    this.logger.debug(`Generando ${amount} pedidos simulados (sin guardar)`);
    return this.#buildDataset(amount).orders;
  }

  getDeliveries(qty) {
    const amount = this.#parseQty(qty);
    this.logger.debug(`Generando ${amount} entregas simuladas (sin guardar)`);
    const couriers = generateUsers(Math.max(1, Math.ceil(amount / 5)), { role: USER_ROLES.COURIER });
    const [customer] = generateUsers(1);
    return Array.from({ length: amount }, () => {
      const order = generateOrder({
        customerId: customer._id,
        status: pick(DELIVERY_ORDER_STATUSES),
      });
      return generateDelivery({ order, courierId: pick(couriers)._id });
    });
  }

  // Dataset completo y coherente entre sí (mismos ids en las relaciones).
  getDataset(qty) {
    const amount = this.#parseQty(qty);
    this.logger.debug(`Generando dataset simulado completo de ${amount} (sin guardar)`);
    return this.#buildDataset(amount);
  }

  // ---------- Carga en la base ----------

  async seed({ qty, type = MOCK_TYPES.USERS } = {}) {
    const result = await this.#executeSeed({ qty, type });
    this.logger.info(
      `Seed de mocks (${type}): ${result.insertados} documentos insertados en ${result.coleccion}`,
      { type, insertados: result.insertados }
    );
    return result;
  }

  async #executeSeed({ qty, type }) {
    // Se valida todo antes de tocar la base.
    this.#assertValidType(type);
    const amount = this.#parseQty(qty);
    const inserted = {};
    switch (type) {
      case MOCK_TYPES.USERS:
        return this.#result(type, await this.#seedUsers(amount, USER_ROLES.USER, type, inserted));
      case MOCK_TYPES.COURIERS:
        return this.#result(type, await this.#seedUsers(amount, USER_ROLES.COURIER, type, inserted));
      case MOCK_TYPES.ORDERS:
        return this.#result(type, await this.#seedOrders(amount, inserted));
      case MOCK_TYPES.DELIVERIES:
        return this.#result(type, await this.#seedDeliveries(amount, inserted));
      default:
        return this.#seedAll(amount, inserted);
    }
  }

  async clear() {
    const deliveries = await this.deliveryRepository.deleteMocks();
    const orders = await this.orderRepository.deleteMocks();
    const users = await this.userRepository.deleteMocks();
    this.logger.info(`Datos mock eliminados: ${deliveries} entregas, ${orders} pedidos, ${users} usuarios`);
    return {
      eliminados: {
        [MOCK_COLLECTIONS[MOCK_TYPES.DELIVERIES]]: deliveries,
        [MOCK_COLLECTIONS[MOCK_TYPES.ORDERS]]: orders,
        [MOCK_COLLECTIONS[MOCK_TYPES.USERS]]: users,
      },
    };
  }

  // ---------- Internos ----------

  #parseQty(raw) {
    if (raw === undefined || raw === '') return MOCK.DEFAULT_QTY;
    const qty = Number(raw);
    if (raw === null || !Number.isFinite(qty)) throw new InvalidMockQuantityError(QTY_REASONS.invalid, raw);
    if (qty < 0) throw new InvalidMockQuantityError(QTY_REASONS.negative, raw);
    if (!Number.isInteger(qty) || qty === 0) throw new InvalidMockQuantityError(QTY_REASONS.invalid, raw);
    if (qty > MOCK.MAX_QTY) {
      throw new InvalidMockQuantityError(QTY_REASONS.outOfRange, raw, { max: MOCK.MAX_QTY });
    }
    return qty;
  }

  #assertValidType(type) {
    const allowed = Object.values(MOCK_TYPES);
    if (!allowed.includes(type)) throw new InvalidMockTypeError(type, allowed);
  }

  // Inserta y, si MongoDB falla, informa qué se alcanzó a guardar antes del error.
  async #insert(repository, docs, type, inserted) {
    try {
      const count = await repository.insertMany(docs);
      inserted[MOCK_COLLECTIONS[type]] = count;
      return count;
    } catch (error) {
      throw new MockSeedError(MOCK_COLLECTIONS[type], { ...inserted }, error);
    }
  }

  #result(type, insertados) {
    return { insertados, coleccion: MOCK_COLLECTIONS[type] };
  }

  #buildDataset(qty) {
    const users = generateUsers(qty, { role: USER_ROLES.USER });
    const couriers = generateUsers(Math.max(1, Math.ceil(qty / 5)), { role: USER_ROLES.COURIER });
    const orders = Array.from({ length: qty }, () => generateOrder({ customerId: pick(users)._id }));
    const deliveries = orders
      .filter(canHaveDelivery)
      .map((order) => generateDelivery({ order, courierId: pick(couriers)._id }));
    return { users, couriers, orders, deliveries };
  }

  // Los mocks se guardan con un password hasheado conocido (MOCK.DEFAULT_PASSWORD).
  async #withPassword(users) {
    const password = await this.hashPassword(MOCK.DEFAULT_PASSWORD);
    return users.map((user) => ({ ...user, password }));
  }

  async #seedUsers(qty, role, type, inserted) {
    const users = await this.#withPassword(generateUsers(qty, { role }));
    return this.#insert(this.userRepository, users, type, inserted);
  }

  async #seedOrders(qty, inserted) {
    const customerIds = await this.userRepository.getIdsByRole(USER_ROLES.USER, MOCK.MAX_QTY);
    if (customerIds.length === 0) {
      throw new MockDependencyMissingError('usuarios con rol USER', 'Sembrá type=users primero o usá type=all');
    }
    const orders = Array.from({ length: qty }, () => generateOrder({ customerId: pick(customerIds) }));
    return this.#insert(this.orderRepository, orders, MOCK_TYPES.ORDERS, inserted);
  }

  async #seedDeliveries(qty, inserted) {
    const candidates = await this.orderRepository.getByStatuses(DELIVERY_ORDER_STATUSES, MOCK.MAX_QTY);
    const alreadyAssigned = new Set(
      await this.deliveryRepository.getOrderIdsWithDelivery(candidates.map((o) => o._id))
    );
    const orders = candidates.filter((o) => !alreadyAssigned.has(o._id)).slice(0, qty);
    if (orders.length === 0) {
      throw new MockDependencyMissingError('pedidos sin entrega', 'Sembrá type=orders primero o usá type=all');
    }
    const courierIds = await this.userRepository.getIdsByRole(USER_ROLES.COURIER, MOCK.MAX_QTY);
    if (courierIds.length === 0) {
      throw new MockDependencyMissingError('repartidores', 'Sembrá type=couriers primero o usá type=all');
    }
    const deliveries = orders.map((order) => generateDelivery({ order, courierId: pick(courierIds) }));
    return this.#insert(this.deliveryRepository, deliveries, MOCK_TYPES.DELIVERIES, inserted);
  }

  async #seedAll(qty, inserted) {
    const { users, couriers, orders, deliveries } = this.#buildDataset(qty);
    const u = await this.#insert(this.userRepository, await this.#withPassword(users), MOCK_TYPES.USERS, inserted);
    const c = await this.#insert(this.userRepository, await this.#withPassword(couriers), MOCK_TYPES.COURIERS, inserted);
    const o = await this.#insert(this.orderRepository, orders, MOCK_TYPES.ORDERS, inserted);
    const d = await this.#insert(this.deliveryRepository, deliveries, MOCK_TYPES.DELIVERIES, inserted);
    return {
      insertados: u + c + o + d,
      coleccion: MOCK_COLLECTIONS[MOCK_TYPES.ALL],
      detalle: { ...inserted },
    };
  }
}
