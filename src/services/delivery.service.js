import { DELIVERY_STATUS, USER_ROLES } from '../constants/index.js';
import {
  DeliveryNotFoundError,
  DeliveryAlreadyExistsError,
  DeliveryCourierRequiredError,
  OrderNotFoundError,
  UserNotFoundError,
  MissingFieldsError,
  InvalidRoleError,
  InvalidStatusError,
  RequestValidationError,
} from '../errors/index.js';
import { assertValidId, findMissingFields, parsePagination } from '../utils/validators.js';
import { generateTrackingCode } from '../utils/tracking.js';
import { noopLogger } from '../utils/noop.logger.js';

const validStatuses = Object.values(DELIVERY_STATUS);
// Estados que solo tienen sentido con un repartidor asignado.
const COURIER_REQUIRED_STATUSES = [DELIVERY_STATUS.IN_TRANSIT, DELIVERY_STATUS.DELIVERED];
const DAY_MS = 24 * 60 * 60 * 1000;

export class DeliveryService {
  constructor(deliveryRepository, orderRepository, userRepository, logger = noopLogger) {
    this.deliveryRepository = deliveryRepository;
    this.orderRepository = orderRepository;
    this.userRepository = userRepository;
    this.logger = logger;
  }

  async getAll({ page, limit } = {}) {
    return this.deliveryRepository.getAll(parsePagination({ page, limit }));
  }

  async getById(id) {
    assertValidId(id);
    const delivery = await this.deliveryRepository.getById(id);
    if (!delivery) throw new DeliveryNotFoundError(id);
    return delivery;
  }

  async create(data = {}) {
    const missing = findMissingFields(data, ['order']);
    if (missing.length) throw new MissingFieldsError(missing);

    assertValidId(data.order);
    const order = await this.orderRepository.getById(data.order);
    if (!order) throw new OrderNotFoundError(data.order);
    if (await this.deliveryRepository.existsByOrder(data.order)) {
      throw new DeliveryAlreadyExistsError(data.order);
    }

    const courier = data.courier ?? null;
    if (courier !== null) await this.#assertCourier(courier);

    const delivery = await this.deliveryRepository.create({
      order: data.order,
      courier,
      status: DELIVERY_STATUS.PENDING,
      trackingCode: generateTrackingCode(),
      scheduledAt: this.#parseScheduledAt(data.scheduledAt),
      deliveredAt: null,
    });

    this.logger.info(`Entrega creada: ${delivery._id} (pedido ${data.order}, tracking ${delivery.trackingCode})`);
    return delivery;
  }

  // Cambia el estado y/o asigna repartidor.
  async update(id, data = {}) {
    const current = await this.getById(id);

    if (data.status === undefined && data.courier === undefined) {
      throw new RequestValidationError([{ field: 'body', message: 'debe enviar status y/o courier' }]);
    }
    if (data.status !== undefined && !validStatuses.includes(data.status)) {
      throw new InvalidStatusError(data.status, validStatuses);
    }
    if (data.courier !== undefined) await this.#assertCourier(data.courier);

    const previousStatus = current.status;
    const status = data.status ?? previousStatus;
    const courier = data.courier ?? current.courier ?? null;
    if (COURIER_REQUIRED_STATUSES.includes(status) && !courier) {
      throw new DeliveryCourierRequiredError(status);
    }

    const updated = await this.deliveryRepository.update(id, {
      status,
      courier,
      deliveredAt: status === DELIVERY_STATUS.DELIVERED ? (current.deliveredAt ?? new Date()) : null,
    });
    this.logger.info(`Entrega ${id}: estado ${previousStatus} -> ${status}`);
    return updated;
  }

  async #assertCourier(courierId) {
    assertValidId(courierId);
    const user = await this.userRepository.getById(courierId);
    if (!user) throw new UserNotFoundError(courierId);
    if (user.role !== USER_ROLES.COURIER) throw new InvalidRoleError(user.role, [USER_ROLES.COURIER]);
  }

  #parseScheduledAt(value) {
    if (value === undefined || value === null) return new Date(Date.now() + DAY_MS);
    const date = new Date(value);
    if (typeof value !== 'string' || Number.isNaN(date.getTime())) {
      throw new RequestValidationError([{ field: 'scheduledAt', message: 'debe ser una fecha válida (ISO 8601)' }]);
    }
    return date;
  }
}
