import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateUsers, generateOrder, generateDelivery, canHaveDelivery } from '../src/utils/mock.generator.js';
import { USER_ROLES, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS, MOCK } from '../src/constants/index.js';

test('generateUsers: rol válido, email único y dominio de prueba', () => {
  const users = generateUsers(50, { role: USER_ROLES.COURIER });
  assert.equal(users.length, 50);
  assert.equal(new Set(users.map((u) => u.email)).size, 50);
  for (const u of users) {
    assert.equal(u.role, USER_ROLES.COURIER);
    assert.ok(u.email.endsWith(`@${MOCK.EMAIL_DOMAIN}`));
    assert.ok(!('password' in u));
    assert.equal(u.isMock, true);
  }
});

test('generateUsers: rechaza roles inválidos', () => {
  assert.throws(() => generateUsers(1, { role: 'HACKER' }));
});

test('generateOrder: estado y prioridad permitidos, total = suma de items', () => {
  for (let i = 0; i < 50; i++) {
    const order = generateOrder({ customerId: 'abc' });
    assert.ok(Object.values(ORDER_STATUS).includes(order.status));
    assert.ok(Object.values(ORDER_PRIORITY).includes(order.priority));
    assert.equal(order.customer, 'abc');
    assert.equal(order.total, order.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0));
  }
});

test('generateOrder: exige customerId', () => {
  assert.throws(() => generateOrder());
});

test('generateDelivery: apunta a su pedido y deriva el estado del pedido', () => {
  const delivered = generateOrder({ customerId: 'c', status: ORDER_STATUS.DELIVERED });
  const d = generateDelivery({ order: delivered, courierId: 'r1' });
  assert.equal(d.order, delivered._id);
  assert.equal(d.courier, 'r1');
  assert.equal(d.status, DELIVERY_STATUS.DELIVERED);
  assert.ok(d.deliveredAt);
});

test('generateDelivery: CONFIRMED => PENDING sin repartidor ni deliveredAt', () => {
  const confirmed = generateOrder({ customerId: 'c', status: ORDER_STATUS.CONFIRMED });
  const d = generateDelivery({ order: confirmed, courierId: 'r1' });
  assert.equal(d.status, DELIVERY_STATUS.PENDING);
  assert.equal(d.courier, null);
  assert.equal(d.deliveredAt, null);
});

test('generateDelivery: IN_TRANSIT exige repartidor', () => {
  const order = generateOrder({ customerId: 'c', status: ORDER_STATUS.IN_TRANSIT });
  assert.throws(() => generateDelivery({ order }));
});

test('PENDING y CANCELLED no pueden tener entrega', () => {
  for (const status of [ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED]) {
    const order = generateOrder({ customerId: 'c', status });
    assert.equal(canHaveDelivery(order), false);
    assert.throws(() => generateDelivery({ order, courierId: 'r' }));
  }
});
