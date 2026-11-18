import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryService } from '../src/services/delivery.service.js';
import { ERROR_CODES } from '../src/errors/index.js';
import { DELIVERY_STATUS, USER_ROLES, LOG_LEVELS } from '../src/constants/index.js';

const ORDER_ID = 'a'.repeat(24);
const OTHER_ORDER_ID = 'f'.repeat(24);
const COURIER_ID = 'b'.repeat(24);
const CLIENT_ID = 'c'.repeat(24);
const MISSING_ID = 'd'.repeat(24);

function setup({ existingDeliveries = [] } = {}) {
  const deliveries = [...existingDeliveries];
  const logs = [];
  const logger = {};
  for (const level of Object.values(LOG_LEVELS)) logger[level] = (msg) => logs.push([level, msg]);

  const deliveryRepository = {
    async create(data) {
      const d = { _id: String(deliveries.length + 1).padStart(24, '0'), ...data };
      deliveries.push(d);
      return d;
    },
    async getAll() { return deliveries; },
    async getById(id) { return deliveries.find((d) => d._id === id) ?? null; },
    async existsByOrder(orderId) { return deliveries.some((d) => d.order === orderId); },
    async update(id, data) { return Object.assign(deliveries.find((d) => d._id === id), data); },
  };
  const orderRepository = {
    async getById(id) { return [ORDER_ID, OTHER_ORDER_ID].includes(id) ? { _id: id } : null; },
  };
  const users = {
    [COURIER_ID]: { _id: COURIER_ID, role: USER_ROLES.COURIER },
    [CLIENT_ID]: { _id: CLIENT_ID, role: USER_ROLES.USER },
  };
  const userRepository = { async getById(id) { return users[id] ?? null; } };
  return { service: new DeliveryService(deliveryRepository, orderRepository, userRepository, logger), deliveries, logs };
}

test('create: nace PENDING con tracking, sin repartidor y loguea info', async () => {
  const { service, logs } = setup();
  const d = await service.create({ order: ORDER_ID });
  assert.equal(d.status, DELIVERY_STATUS.PENDING);
  assert.equal(d.courier, null);
  assert.match(d.trackingCode, /^SN-[0-9A-F]{8}$/);
  assert.ok(d.scheduledAt > new Date());
  assert.equal(logs[0][0], LOG_LEVELS.INFO);
});

test('create: con repartidor válido lo asocia', async () => {
  const { service } = setup();
  assert.equal((await service.create({ order: ORDER_ID, courier: COURIER_ID })).courier, COURIER_ID);
});

test('create: errores de validación', async () => {
  const { service } = setup();
  await assert.rejects(() => service.create({}), { code: ERROR_CODES.MISSING_FIELDS });
  await assert.rejects(() => service.create({ order: '123' }), { code: ERROR_CODES.INVALID_ID });
  await assert.rejects(() => service.create({ order: MISSING_ID }), { code: ERROR_CODES.ORDER_NOT_FOUND, statusCode: 404 });
  await assert.rejects(() => service.create({ order: ORDER_ID, courier: MISSING_ID }), { code: ERROR_CODES.USER_NOT_FOUND });
  await assert.rejects(() => service.create({ order: ORDER_ID, courier: CLIENT_ID }), { code: ERROR_CODES.INVALID_ROLE });
  await assert.rejects(() => service.create({ order: ORDER_ID, scheduledAt: 'mañana' }), { code: ERROR_CODES.VALIDATION_ERROR });
});

test('create: un pedido solo admite una entrega => DELIVERY_ALREADY_EXISTS 409', async () => {
  const { service } = setup();
  await service.create({ order: ORDER_ID });
  await assert.rejects(() => service.create({ order: ORDER_ID }), { code: ERROR_CODES.DELIVERY_ALREADY_EXISTS, statusCode: 409 });
});

test('getById: inexistente => DELIVERY_NOT_FOUND; formato inválido => INVALID_ID', async () => {
  const { service } = setup();
  await assert.rejects(() => service.getById(MISSING_ID), { code: ERROR_CODES.DELIVERY_NOT_FOUND, statusCode: 404 });
  await assert.rejects(() => service.getById('x'), { code: ERROR_CODES.INVALID_ID });
});

test('update: IN_TRANSIT sin repartidor => DELIVERY_COURIER_REQUIRED 409', async () => {
  const { service } = setup();
  const d = await service.create({ order: ORDER_ID });
  await assert.rejects(
    () => service.update(d._id, { status: DELIVERY_STATUS.IN_TRANSIT }),
    { code: ERROR_CODES.DELIVERY_COURIER_REQUIRED, statusCode: 409 }
  );
});

test('update: asignar repartidor y pasar a IN_TRANSIT, luego DELIVERED completa deliveredAt', async () => {
  const { service } = setup();
  const d = await service.create({ order: ORDER_ID });
  const inTransit = await service.update(d._id, { status: DELIVERY_STATUS.IN_TRANSIT, courier: COURIER_ID });
  assert.equal(inTransit.courier, COURIER_ID);
  assert.equal(inTransit.deliveredAt, null);
  const delivered = await service.update(d._id, { status: DELIVERY_STATUS.DELIVERED });
  assert.ok(delivered.deliveredAt instanceof Date);
});

test('update: status inválido, body vacío y repartidor con rol incorrecto', async () => {
  const { service } = setup();
  const d = await service.create({ order: ORDER_ID });
  await assert.rejects(() => service.update(d._id, { status: 'ROTO' }), { code: ERROR_CODES.INVALID_STATUS });
  await assert.rejects(() => service.update(d._id, {}), { code: ERROR_CODES.VALIDATION_ERROR });
  await assert.rejects(() => service.update(d._id, { courier: CLIENT_ID }), { code: ERROR_CODES.INVALID_ROLE });
  await assert.rejects(() => service.update(MISSING_ID, { status: DELIVERY_STATUS.FAILED }), { code: ERROR_CODES.DELIVERY_NOT_FOUND });
});

test('update: FAILED no exige repartidor', async () => {
  const { service } = setup();
  const d = await service.create({ order: ORDER_ID });
  assert.equal((await service.update(d._id, { status: DELIVERY_STATUS.FAILED })).status, DELIVERY_STATUS.FAILED);
});
