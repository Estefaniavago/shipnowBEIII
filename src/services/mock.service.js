import {
  USER_ROLES,
  ORDER_TO_DELIVERY_STATUS,
  MOCK,
  MOCK_TYPES,
  MOCK_COLLECTIONS,
} from '../constants/index.js';
import { AppError } from '../utils/AppError.js';
import {
  generateUsers,
  generateOrder,
  generateDelivery,
  canHaveDelivery,
  pick,
} from '../utils/mock.generator.js';

const DELIVERY_ORDER_STATUSES = Object.keys(ORDER_TO_DELIVERY_STATUS);

export class MockService {
  constructor({ userRepository, orderRepository, deliveryRepository, hashPassword }) {
    this.userRepository = userRepository;
    this.orderRepository = orderRepository;
    this.deliveryRepository = deliveryRepository;
    this.hashPassword = hashPassword;
  }

  // ---------- Datos simulados (NO se guardan) ----------

  getUsers(qty) {
    return generateUsers(this.#parseQty(qty), { role: USER_ROLES.USER });
  }

  getCouriers(qty) {
    return generateUsers(this.#parseQty(qty), { role: USER_ROLES.COURIER });
  }

  getOrders(qty) {
    return this.#buildDataset(this.#parseQty(qty)).orders;
  }

  getDeliveries(qty) {
    const amount = this.#parseQty(qty);
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
    return this.#buildDataset(this.#parseQty(qty));
  }

  // ---------- Carga en la base ----------

  async seed({ qty, type = MOCK_TYPES.USERS } = {}) {
    const amount = this.#parseQty(qty);
    switch (type) {
      case MOCK_TYPES.USERS:
        return this.#result(type, await this.#seedUsers(amount, USER_ROLES.USER));
      case MOCK_TYPES.COURIERS:
        return this.#result(type, await this.#seedUsers(amount, USER_ROLES.COURIER));
      case MOCK_TYPES.ORDERS:
        return this.#result(type, await this.#seedOrders(amount));
      case MOCK_TYPES.DELIVERIES:
        return this.#result(type, await this.#seedDeliveries(amount));
      case MOCK_TYPES.ALL:
        return this.#seedAll(amount);
      default:
        throw new AppError(`type inválido. Permitidos: ${Object.values(MOCK_TYPES).join(', ')}`, 400);
    }
  }

  async clear() {
    const deliveries = await this.deliveryRepository.deleteMocks();
    const orders = await this.orderRepository.deleteMocks();
    const users = await this.userRepository.deleteMocks();
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
    if (!Number.isInteger(qty) || qty < 1 || qty > MOCK.MAX_QTY) {
      throw new AppError(`qty debe ser un entero entre 1 y ${MOCK.MAX_QTY}`, 400);
    }
    return qty;
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

  async #seedUsers(qty, role) {
    const users = await this.#withPassword(generateUsers(qty, { role }));
    return this.userRepository.insertMany(users);
  }

  async #seedOrders(qty) {
    const customerIds = await this.userRepository.getIdsByRole(USER_ROLES.USER, MOCK.MAX_QTY);
    if (customerIds.length === 0) {
      throw new AppError('No hay usuarios con rol USER. Sembrá type=users primero o usá type=all', 409);
    }
    const orders = Array.from({ length: qty }, () => generateOrder({ customerId: pick(customerIds) }));
    return this.orderRepository.insertMany(orders);
  }

  async #seedDeliveries(qty) {
    const candidates = await this.orderRepository.getByStatuses(DELIVERY_ORDER_STATUSES, MOCK.MAX_QTY);
    const alreadyAssigned = new Set(
      await this.deliveryRepository.getOrderIdsWithDelivery(candidates.map((o) => o._id))
    );
    const orders = candidates.filter((o) => !alreadyAssigned.has(o._id)).slice(0, qty);
    if (orders.length === 0) {
      throw new AppError('No hay pedidos sin entrega. Sembrá type=orders primero o usá type=all', 409);
    }
    const courierIds = await this.userRepository.getIdsByRole(USER_ROLES.COURIER, MOCK.MAX_QTY);
    if (courierIds.length === 0) {
      throw new AppError('No hay repartidores. Sembrá type=couriers primero o usá type=all', 409);
    }
    const deliveries = orders.map((order) => generateDelivery({ order, courierId: pick(courierIds) }));
    return this.deliveryRepository.insertMany(deliveries);
  }

  async #seedAll(qty) {
    const { users, couriers, orders, deliveries } = this.#buildDataset(qty);
    const insertedUsers = await this.userRepository.insertMany(await this.#withPassword(users));
    const insertedCouriers = await this.userRepository.insertMany(await this.#withPassword(couriers));
    const insertedOrders = await this.orderRepository.insertMany(orders);
    const insertedDeliveries = await this.deliveryRepository.insertMany(deliveries);
    return {
      insertados: insertedUsers + insertedCouriers + insertedOrders + insertedDeliveries,
      coleccion: MOCK_COLLECTIONS[MOCK_TYPES.ALL],
      detalle: {
        [MOCK_COLLECTIONS[MOCK_TYPES.USERS]]: insertedUsers,
        [MOCK_COLLECTIONS[MOCK_TYPES.COURIERS]]: insertedCouriers,
        [MOCK_COLLECTIONS[MOCK_TYPES.ORDERS]]: insertedOrders,
        [MOCK_COLLECTIONS[MOCK_TYPES.DELIVERIES]]: insertedDeliveries,
      },
    };
  }
}
