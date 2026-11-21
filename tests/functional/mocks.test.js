import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectObjectId } from './helpers/assertions.js';
import { createUser, createCourier, createOrder } from './helpers/factories.js';
import {
  USER_ROLES, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS, MOCK, MOCK_COLLECTIONS, MOCK_TYPES,
} from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

const listUsers = async () => expectSuccess(await api().get('/api/users?limit=100'));
const listOrders = async () => expectSuccess(await api().get('/api/orders?limit=100'));
const listDeliveries = async () => expectSuccess(await api().get('/api/deliveries?limit=100'));

describe('Mocks - /api/mocks', () => {
  // ---------------------------------------------------------------- GET (no guardan)
  describe('GET /api/mocks/users', () => {
    it('200: devuelve qty clientes simulados (array directo, rol USER, email de prueba)', async () => {
      const res = await api().get('/api/mocks/users?qty=2');

      expect(res.status).to.equal(200);
      expect(res.type).to.equal('application/json');
      expect(res.body).to.be.an('array').with.lengthOf(2);
      res.body.forEach((user) => {
        expect(user).to.include.all.keys('_id', 'name', 'email', 'role');
        expectObjectId(user._id);
        expect(user.role).to.equal(USER_ROLES.USER);
        expect(user.email).to.match(new RegExp(`^[a-z]+\\.[a-z]+\\.\\d+@${MOCK.EMAIL_DOMAIN.replace('.', '\\.')}$`));
        expect(user.isMock).to.equal(true);
        expect(user).to.not.have.property('password');
      });
      expect(res.body[0].email).to.not.equal(res.body[1].email);
    });

    it('200: usa la cantidad por defecto cuando no se envía qty', async () => {
      const res = await api().get('/api/mocks/users');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(MOCK.DEFAULT_QTY);
    });

    it('200: NO guarda nada en la base de datos', async () => {
      await api().get('/api/mocks/users?qty=5');
      await api().get('/api/mocks/orders?qty=5');
      await api().get('/api/mocks/dataset?qty=5');

      expect(await listUsers()).to.be.empty;
      expect(await listOrders()).to.be.empty;
      expect(await listDeliveries()).to.be.empty;
    });
  });

  describe('GET /api/mocks/couriers', () => {
    it('200: devuelve repartidores con rol COURIER', async () => {
      const res = await api().get('/api/mocks/couriers?qty=3');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(3);
      res.body.forEach((courier) => expect(courier.role).to.equal(USER_ROLES.COURIER));
    });
  });

  describe('GET /api/mocks/orders', () => {
    it('200: devuelve pedidos con estado, prioridad, items y total coherentes', async () => {
      const res = await api().get('/api/mocks/orders?qty=4');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(4);
      res.body.forEach((order) => {
        expect(order).to.include.all.keys('_id', 'customer', 'items', 'total', 'status', 'priority', 'shippingAddress');
        expectObjectId(order._id);
        expectObjectId(order.customer);
        expect(Object.values(ORDER_STATUS)).to.include(order.status);
        expect(Object.values(ORDER_PRIORITY)).to.include(order.priority);
        expect(order.items).to.be.an('array').that.is.not.empty;
        const expectedTotal = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        expect(order.total).to.equal(expectedTotal);
        expect(order.shippingAddress).to.have.all.keys('street', 'city');
      });
    });
  });

  describe('GET /api/mocks/deliveries', () => {
    it('200: devuelve entregas asociadas a un pedido y con repartidor cuando el estado lo requiere', async () => {
      const res = await api().get('/api/mocks/deliveries?qty=6');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(6);
      res.body.forEach((delivery) => {
        expect(delivery).to.include.all.keys('_id', 'order', 'courier', 'status', 'trackingCode', 'scheduledAt', 'deliveredAt');
        expectObjectId(delivery.order);
        expect(Object.values(DELIVERY_STATUS)).to.include(delivery.status);
        if (delivery.status === DELIVERY_STATUS.PENDING) {
          expect(delivery.courier).to.equal(null);
        } else {
          expectObjectId(delivery.courier);
        }
        if (delivery.status === DELIVERY_STATUS.DELIVERED) {
          expect(delivery.deliveredAt).to.be.a('string');
        } else {
          expect(delivery.deliveredAt).to.equal(null);
        }
      });
    });
  });

  describe('GET /api/mocks/dataset', () => {
    it('200: conjunto coherente (los pedidos apuntan a usuarios y las entregas a pedidos y repartidores)', async () => {
      const res = await api().get('/api/mocks/dataset?qty=5');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.all.keys('users', 'couriers', 'orders', 'deliveries');
      const { users, couriers, orders, deliveries } = res.body;
      expect(users).to.have.lengthOf(5);
      expect(orders).to.have.lengthOf(5);
      expect(couriers).to.have.lengthOf(1);

      users.forEach((u) => expect(u.role).to.equal(USER_ROLES.USER));
      couriers.forEach((c) => expect(c.role).to.equal(USER_ROLES.COURIER));

      const userIds = users.map((u) => u._id);
      const courierIds = couriers.map((c) => c._id);
      const orderById = new Map(orders.map((o) => [o._id, o]));

      orders.forEach((order) => expect(userIds).to.include(order.customer));
      deliveries.forEach((delivery) => {
        expect(orderById.has(delivery.order), 'la entrega apunta a un pedido del dataset').to.equal(true);
        expect([ORDER_STATUS.PENDING, ORDER_STATUS.CANCELLED]).to.not.include(orderById.get(delivery.order).status);
        if (delivery.courier) expect(courierIds).to.include(delivery.courier);
      });
    });
  });

  describe('GET /api/mocks/* - cantidades inválidas', () => {
    const INVALID_QTY = [
      ['abc', ERROR_CODES.MOCK_QTY_INVALID],
      ['0', ERROR_CODES.MOCK_QTY_INVALID],
      ['1.5', ERROR_CODES.MOCK_QTY_INVALID],
      ['-5', ERROR_CODES.MOCK_QTY_NEGATIVE],
      [String(MOCK.MAX_QTY + 1), ERROR_CODES.MOCK_QTY_OUT_OF_RANGE],
    ];

    INVALID_QTY.forEach(([qty, code]) => {
      it(`400 ${code}: /api/mocks/users?qty=${qty}`, async () => {
        const url = `/api/mocks/users?qty=${qty}`;
        const body = expectError(await api().get(url), { status: 400, code, path: url });
        expect(body.details[0]).to.include({ field: 'qty', value: qty });
      });
    });

    it('400 MOCK_QTY_OUT_OF_RANGE: informa el máximo permitido', async () => {
      const body = expectError(await api().get('/api/mocks/orders?qty=500'), {
        status: 400, code: ERROR_CODES.MOCK_QTY_OUT_OF_RANGE,
      });
      expect(body.details[0]).to.include({ field: 'qty', max: MOCK.MAX_QTY });
    });

    ['couriers', 'orders', 'deliveries', 'dataset'].forEach((endpoint) => {
      it(`400 MOCK_QTY_NEGATIVE: /api/mocks/${endpoint}?qty=-1`, async () => {
        expectError(await api().get(`/api/mocks/${endpoint}?qty=-1`), {
          status: 400, code: ERROR_CODES.MOCK_QTY_NEGATIVE,
        });
      });
    });
  });

  // ---------------------------------------------------------------- POST seed
  describe('POST /api/mocks/seed', () => {
    it('201: por defecto inserta usuarios y responde { insertados, coleccion }', async () => {
      const res = await api().post('/api/mocks/seed?qty=10');

      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal({ insertados: 10, coleccion: MOCK_COLLECTIONS[MOCK_TYPES.USERS] });

      const users = await listUsers();
      expect(users).to.have.lengthOf(10);
      users.forEach((user) => {
        expect(user.role).to.equal(USER_ROLES.USER);
        expect(user.isMock).to.equal(true);
        expect(user).to.not.have.property('password');
      });
    });

    it('201: type=couriers inserta repartidores', async () => {
      const res = await api().post('/api/mocks/seed?qty=3&type=couriers');
      expect(res.body).to.deep.equal({ insertados: 3, coleccion: MOCK_COLLECTIONS[MOCK_TYPES.COURIERS] });

      const users = await listUsers();
      expect(users).to.have.lengthOf(3);
      users.forEach((user) => expect(user.role).to.equal(USER_ROLES.COURIER));
    });

    it('201: type=orders inserta pedidos asociados a usuarios existentes', async () => {
      await api().post('/api/mocks/seed?qty=3&type=users');
      const userIds = (await listUsers()).map((u) => u._id);

      const res = await api().post('/api/mocks/seed?qty=4&type=orders');
      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal({ insertados: 4, coleccion: MOCK_COLLECTIONS[MOCK_TYPES.ORDERS] });

      const orders = await listOrders();
      expect(orders).to.have.lengthOf(4);
      orders.forEach((order) => {
        expect(userIds).to.include(order.customer);
        expect(order.isMock).to.equal(true);
      });
    });

    it('201: type=deliveries inserta entregas para pedidos existentes sin entrega', async () => {
      const customer = await createUser();
      await createCourier();
      const order = await createOrder(customer._id);
      expectSuccess(await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CONFIRMED }));

      const res = await api().post('/api/mocks/seed?qty=1&type=deliveries');
      expect(res.status).to.equal(201);
      expect(res.body).to.deep.equal({ insertados: 1, coleccion: MOCK_COLLECTIONS[MOCK_TYPES.DELIVERIES] });

      const deliveries = await listDeliveries();
      expect(deliveries).to.have.lengthOf(1);
      expect(deliveries[0]).to.include({ order: order._id, status: DELIVERY_STATUS.PENDING, isMock: true });
    });

    it('201: type=all inserta todo el conjunto con las relaciones resueltas en la base', async () => {
      const res = await api().post('/api/mocks/seed?qty=5&type=all');

      expect(res.status).to.equal(201);
      expect(res.body).to.have.all.keys('insertados', 'coleccion', 'detalle');
      expect(res.body.coleccion).to.equal(MOCK_COLLECTIONS[MOCK_TYPES.ALL]);
      const { detalle } = res.body;
      expect(detalle).to.include({ usuarios: 5, repartidores: 1, pedidos: 5 });
      expect(res.body.insertados).to.equal(Object.values(detalle).reduce((a, b) => a + b, 0));

      const users = await listUsers();
      const orders = await listOrders();
      const deliveries = await listDeliveries();
      expect(users).to.have.lengthOf(detalle.usuarios + detalle.repartidores);
      expect(orders).to.have.lengthOf(detalle.pedidos);
      expect(deliveries).to.have.lengthOf(detalle.entregas);

      const clientIds = users.filter((u) => u.role === USER_ROLES.USER).map((u) => u._id);
      const courierIds = users.filter((u) => u.role === USER_ROLES.COURIER).map((u) => u._id);
      const orderIds = orders.map((o) => o._id);
      orders.forEach((order) => expect(clientIds).to.include(order.customer));
      deliveries.forEach((delivery) => {
        expect(orderIds).to.include(delivery.order);
        if (delivery.courier) expect(courierIds).to.include(delivery.courier);
      });
    });

    it('400 MOCK_QTY_NEGATIVE / MOCK_QTY_INVALID / MOCK_QTY_OUT_OF_RANGE y no inserta nada', async () => {
      expectError(await api().post('/api/mocks/seed?qty=-5'), { status: 400, code: ERROR_CODES.MOCK_QTY_NEGATIVE });
      expectError(await api().post('/api/mocks/seed?qty=abc'), { status: 400, code: ERROR_CODES.MOCK_QTY_INVALID });
      expectError(await api().post('/api/mocks/seed?qty=0'), { status: 400, code: ERROR_CODES.MOCK_QTY_INVALID });
      expectError(await api().post(`/api/mocks/seed?qty=${MOCK.MAX_QTY + 1}`), {
        status: 400, code: ERROR_CODES.MOCK_QTY_OUT_OF_RANGE,
      });

      expect(await listUsers()).to.be.empty;
    });

    it('400 MOCK_TYPE_INVALID: type desconocido', async () => {
      const body = expectError(await api().post('/api/mocks/seed?qty=5&type=cosas'), {
        status: 400, code: ERROR_CODES.MOCK_TYPE_INVALID,
      });
      expect(body.details[0].allowed).to.have.members(Object.values(MOCK_TYPES));
      expect(await listUsers()).to.be.empty;
    });

    it('409 MOCK_DEPENDENCY_MISSING: orders sin usuarios en la base', async () => {
      expectError(await api().post('/api/mocks/seed?qty=3&type=orders'), {
        status: 409, code: ERROR_CODES.MOCK_DEPENDENCY_MISSING,
      });
      expect(await listOrders()).to.be.empty;
    });

    it('409 MOCK_DEPENDENCY_MISSING: deliveries sin pedidos, y sin repartidores', async () => {
      expectError(await api().post('/api/mocks/seed?qty=3&type=deliveries'), {
        status: 409, code: ERROR_CODES.MOCK_DEPENDENCY_MISSING,
      });

      // hay un pedido elegible pero ningún repartidor
      const customer = await createUser();
      const order = await createOrder(customer._id);
      expectSuccess(await api().patch(`/api/orders/${order._id}/status`).send({ status: ORDER_STATUS.CONFIRMED }));
      expectError(await api().post('/api/mocks/seed?qty=1&type=deliveries'), {
        status: 409, code: ERROR_CODES.MOCK_DEPENDENCY_MISSING,
      });
    });
  });

  // ---------------------------------------------------------------- DELETE seed (limpieza)
  describe('DELETE /api/mocks/seed', () => {
    it('200: elimina solo los datos de prueba y conserva los datos reales', async () => {
      const real = await createUser({ name: 'Usuario real' });
      const seeded = await api().post('/api/mocks/seed?qty=5&type=all');
      const { detalle } = seeded.body;

      const res = await api().delete('/api/mocks/seed');

      expect(res.status).to.equal(200);
      expect(res.body).to.have.all.keys('eliminados');
      expect(res.body.eliminados).to.deep.equal({
        entregas: detalle.entregas,
        pedidos: detalle.pedidos,
        usuarios: detalle.usuarios + detalle.repartidores,
      });

      const remaining = await listUsers();
      expect(remaining.map((u) => u._id)).to.deep.equal([real._id]);
      expect(await listOrders()).to.be.empty;
      expect(await listDeliveries()).to.be.empty;
    });

    it('200: sin datos de prueba devuelve todo en 0', async () => {
      const res = await api().delete('/api/mocks/seed');
      expect(res.status).to.equal(200);
      expect(res.body.eliminados).to.deep.equal({ entregas: 0, pedidos: 0, usuarios: 0 });
    });
  });
});
