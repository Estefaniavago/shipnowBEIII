import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockService } from '../src/services/mock.service.js';
import { USER_ROLES, ORDER_STATUS, MOCK, MOCK_TYPES } from '../src/constants/index.js';

function makeService({ userIds = {}, orders = [], assigned = [] } = {}) {
  const saved = { users: [], orders: [], deliveries: [] };
  const userRepository = {
    insertMany: async (docs) => (saved.users.push(...docs), docs.length),
    getIdsByRole: async (role) => userIds[role] ?? [],
    deleteMocks: async () => 3,
  };
  const orderRepository = {
    insertMany: async (docs) => (saved.orders.push(...docs), docs.length),
    getByStatuses: async () => orders,
    deleteMocks: async () => 2,
  };
  const deliveryRepository = {
    insertMany: async (docs) => (saved.deliveries.push(...docs), docs.length),
    getOrderIdsWithDelivery: async () => assigned,
    deleteMocks: async () => 1,
  };
  const service = new MockService({
    userRepository,
    orderRepository,
    deliveryRepository,
    hashPassword: async (p) => `hash(${p})`,
  });
  return { service, saved };
}

test('getUsers: devuelve qty usuarios con rol USER sin tocar la base', () => {
  const { service, saved } = makeService();
  const users = service.getUsers('4');
  assert.equal(users.length, 4);
  assert.ok(users.every((u) => u.role === USER_ROLES.USER));
  assert.equal(saved.users.length, 0);
});

test('qty inválida o fuera de rango => 400', () => {
  const { service } = makeService();
  for (const bad of ['0', '-1', 'abc', '1.5', String(MOCK.MAX_QTY + 1)]) {
    assert.throws(() => service.getUsers(bad), { statusCode: 400 });
  }
});

test('qty por defecto cuando no se envía', () => {
  const { service } = makeService();
  assert.equal(service.getCouriers().length, MOCK.DEFAULT_QTY);
});

test('getDataset: relaciones consistentes', () => {
  const { service } = makeService();
  const { users, couriers, orders, deliveries } = service.getDataset('20');
  const userIds = new Set(users.map((u) => u._id));
  const courierIds = new Set(couriers.map((c) => c._id));
  const orderById = new Map(orders.map((o) => [o._id, o]));
  assert.ok(couriers.every((c) => c.role === USER_ROLES.COURIER));
  assert.ok(orders.every((o) => userIds.has(o.customer)));
  for (const d of deliveries) {
    assert.ok(orderById.has(d.order), 'la entrega apunta a un pedido existente');
    assert.notEqual(orderById.get(d.order).status, ORDER_STATUS.CANCELLED);
    if (d.courier) assert.ok(courierIds.has(d.courier));
  }
});

test('getDeliveries: devuelve qty entregas', () => {
  const { service } = makeService();
  assert.equal(service.getDeliveries('7').length, 7);
});

test('seed users: guarda con password hasheado y responde en el formato esperado', async () => {
  const { service, saved } = makeService();
  const result = await service.seed({ qty: '10' });
  assert.deepEqual(result, { insertados: 10, coleccion: 'usuarios' });
  assert.ok(saved.users.every((u) => u.password === `hash(${MOCK.DEFAULT_PASSWORD})` && u.isMock));
});

test('seed couriers: guarda con rol COURIER', async () => {
  const { service, saved } = makeService();
  const result = await service.seed({ qty: 3, type: MOCK_TYPES.COURIERS });
  assert.deepEqual(result, { insertados: 3, coleccion: 'repartidores' });
  assert.ok(saved.users.every((u) => u.role === USER_ROLES.COURIER));
});

test('seed orders sin clientes en la base => 409', async () => {
  const { service } = makeService();
  await assert.rejects(() => service.seed({ qty: 2, type: MOCK_TYPES.ORDERS }), { statusCode: 409 });
});

test('seed orders: usa ids de clientes existentes', async () => {
  const { service, saved } = makeService({ userIds: { [USER_ROLES.USER]: ['u1', 'u2'] } });
  const result = await service.seed({ qty: 5, type: MOCK_TYPES.ORDERS });
  assert.deepEqual(result, { insertados: 5, coleccion: 'pedidos' });
  assert.ok(saved.orders.every((o) => ['u1', 'u2'].includes(o.customer)));
});

test('seed deliveries: omite pedidos que ya tienen entrega y asigna repartidores existentes', async () => {
  const { service, saved } = makeService({
    userIds: { [USER_ROLES.COURIER]: ['r1'] },
    orders: [
      { _id: 'o1', status: ORDER_STATUS.DELIVERED },
      { _id: 'o2', status: ORDER_STATUS.IN_TRANSIT },
    ],
    assigned: ['o1'],
  });
  const result = await service.seed({ qty: 5, type: MOCK_TYPES.DELIVERIES });
  assert.deepEqual(result, { insertados: 1, coleccion: 'entregas' });
  assert.equal(saved.deliveries[0].order, 'o2');
  assert.equal(saved.deliveries[0].courier, 'r1');
});

test('seed deliveries sin pedidos => 409; sin repartidores => 409', async () => {
  await assert.rejects(() => makeService().service.seed({ type: MOCK_TYPES.DELIVERIES }), { statusCode: 409 });
  const noCouriers = makeService({ orders: [{ _id: 'o1', status: ORDER_STATUS.DELIVERED }] });
  await assert.rejects(() => noCouriers.service.seed({ type: MOCK_TYPES.DELIVERIES }), { statusCode: 409 });
});

test('seed all: inserta todo y suma el detalle', async () => {
  const { service, saved } = makeService();
  const result = await service.seed({ qty: '10', type: MOCK_TYPES.ALL });
  assert.equal(result.coleccion, 'todas');
  assert.equal(result.detalle.usuarios, 10);
  assert.equal(result.detalle.pedidos, 10);
  assert.equal(result.insertados, Object.values(result.detalle).reduce((a, b) => a + b, 0));
  const orderIds = new Set(saved.orders.map((o) => o._id));
  assert.ok(saved.deliveries.every((d) => orderIds.has(d.order)));
});

test('seed con type inválido => 400', async () => {
  const { service } = makeService();
  await assert.rejects(() => service.seed({ type: 'cosas' }), { statusCode: 400 });
});

test('clear: borra solo mocks y informa cantidades', async () => {
  const { service } = makeService();
  assert.deepEqual(await service.clear(), { eliminados: { entregas: 1, pedidos: 2, usuarios: 3 } });
});
