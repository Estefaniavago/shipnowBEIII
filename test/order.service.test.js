import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OrderService } from '../src/services/order.service.js';
import { ERROR_CODES } from '../src/errors/index.js';
import { LOG_LEVELS, ORDER_PRIORITY, ORDER_STATUS } from '../src/constants/index.js';

const CUSTOMER_ID = 'c'.repeat(24);
const MISSING_ID = 'd'.repeat(24);

function setup({ withCustomer = true } = {}) {
  const calls = [];
  const logger = {};
  for (const level of Object.values(LOG_LEVELS)) logger[level] = (msg) => calls.push([level, msg]);
  const created = [];
  const orderRepository = {
    async create(data) {
      const order = { _id: 'e'.repeat(24), ...data };
      created.push(order);
      return order;
    },
    async getById(id) {
      return created.find((o) => o._id === id) ?? null;
    },
    async getAll() {
      return created;
    },
  };
  const userRepository = {
    async getById(id) {
      return withCustomer && id === CUSTOMER_ID ? { _id: id, role: 'USER' } : null;
    },
  };
  return { service: new OrderService(orderRepository, userRepository, logger), calls, created };
}

const validOrder = () => ({
  customer: CUSTOMER_ID,
  items: [
    { name: 'Caja', quantity: 2, unitPrice: 100 },
    { name: 'Cinta', quantity: 1, unitPrice: 50 },
  ],
  shippingAddress: { street: 'Mitre 123', city: 'Neuquén' },
});

test('create: arma el pedido (total, estado PENDING, prioridad NORMAL) y loguea info', async () => {
  const { service, calls } = setup();
  const order = await service.create(validOrder());
  assert.equal(order.total, 250);
  assert.equal(order.status, ORDER_STATUS.PENDING);
  assert.equal(order.priority, ORDER_PRIORITY.NORMAL);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], LOG_LEVELS.INFO);
  assert.match(calls[0][1], /^Pedido creado: /);
});

test('create: faltan campos => MISSING_FIELDS y no loguea', async () => {
  const { service, calls } = setup();
  await assert.rejects(() => service.create({}), { code: ERROR_CODES.MISSING_FIELDS });
  assert.equal(calls.length, 0);
});

test('create: cliente inexistente => USER_NOT_FOUND', async () => {
  const { service } = setup();
  await assert.rejects(() => service.create({ ...validOrder(), customer: MISSING_ID }), { code: ERROR_CODES.USER_NOT_FOUND });
});

test('create: customer con formato inválido => INVALID_ID', async () => {
  const { service } = setup();
  await assert.rejects(() => service.create({ ...validOrder(), customer: '123' }), { code: ERROR_CODES.INVALID_ID });
});

test('create: items vacíos o mal formados', async () => {
  const { service } = setup();
  await assert.rejects(() => service.create({ ...validOrder(), items: [] }), { code: ERROR_CODES.VALIDATION_ERROR });
  await assert.rejects(() => service.create({ ...validOrder(), items: [{ name: 'X' }] }), { code: ERROR_CODES.MISSING_FIELDS });
  await assert.rejects(
    () => service.create({ ...validOrder(), items: [{ name: 'X', quantity: 1.5, unitPrice: 10 }] }),
    { code: ERROR_CODES.VALIDATION_ERROR }
  );
  await assert.rejects(
    () => service.create({ ...validOrder(), items: [{ name: 'X', quantity: 1, unitPrice: -10 }] }),
    { code: ERROR_CODES.NEGATIVE_VALUE }
  );
});

test('create: dirección incompleta => MISSING_FIELDS', async () => {
  const { service } = setup();
  await assert.rejects(
    () => service.create({ ...validOrder(), shippingAddress: { street: 'Mitre 1' } }),
    (err) => err.code === ERROR_CODES.MISSING_FIELDS && err.details[0].field === 'shippingAddress.city'
  );
});

test('create: prioridad inválida => INVALID_PRIORITY', async () => {
  const { service } = setup();
  await assert.rejects(() => service.create({ ...validOrder(), priority: 'YA' }), { code: ERROR_CODES.INVALID_PRIORITY });
});

test('getById: inexistente => ORDER_NOT_FOUND', async () => {
  const { service } = setup();
  await assert.rejects(() => service.getById(MISSING_ID), { code: ERROR_CODES.ORDER_NOT_FOUND, statusCode: 404 });
});
