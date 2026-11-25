import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess } from './helpers/assertions.js';
import {
  createUser, createCourier, createOrder, createDelivery, createCustomerWithOrder,
} from './helpers/factories.js';
import {
  PAGINATION, USER_ROLES, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS,
} from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Performance de los listados: paginación y filtros', () => {
  describe('paginación por defecto y límite máximo', () => {
    // Datos controlados: el seed de mocks crea 36 usuarios (30 clientes + 6 repartidores) y 30 pedidos.
    beforeEach(async () => {
      const res = await api().post('/api/mocks/seed?qty=30&type=all');
      expect(res.status).to.equal(201);
    });

    it('GET /api/users nunca devuelve la colección completa: aplica el límite por defecto', async () => {
      const users = expectSuccess(await api().get('/api/users'));
      expect(users).to.have.lengthOf(PAGINATION.DEFAULT_LIMIT);
    });

    it('GET /api/orders aplica el límite por defecto y permite pedir las páginas siguientes', async () => {
      const first = expectSuccess(await api().get('/api/orders'));
      const second = expectSuccess(await api().get('/api/orders?page=2'));

      expect(first).to.have.lengthOf(PAGINATION.DEFAULT_LIMIT);
      expect(second).to.have.lengthOf(30 - PAGINATION.DEFAULT_LIMIT);
      const firstIds = first.map((o) => o._id);
      second.forEach((o) => expect(firstIds).to.not.include(o._id));
    });

    it('limit=100 (el máximo) devuelve todo lo que hay, sin pasarse', async () => {
      expect(expectSuccess(await api().get(`/api/users?limit=${PAGINATION.MAX_LIMIT}`))).to.have.lengthOf(36);
      expect(expectSuccess(await api().get(`/api/orders?limit=${PAGINATION.MAX_LIMIT}`))).to.have.lengthOf(30);
    });

    it('limit=2 devuelve exactamente 2', async () => {
      expect(expectSuccess(await api().get('/api/users?limit=2'))).to.have.lengthOf(2);
      expect(expectSuccess(await api().get('/api/orders?limit=2'))).to.have.lengthOf(2);
    });

    ['users', 'orders', 'deliveries', 'products'].forEach((resource) => {
      it(`400 VALIDATION_ERROR: /api/${resource}?limit=${PAGINATION.MAX_LIMIT + 1} supera el máximo`, async () => {
        const body = expectError(await api().get(`/api/${resource}?limit=${PAGINATION.MAX_LIMIT + 1}`), {
          status: 400, code: ERROR_CODES.VALIDATION_ERROR,
        });
        expect(body.details[0]).to.include({ field: 'limit' });
      });
    });
  });

  describe('filtro de usuarios por rol', () => {
    it('200: ?role= devuelve solo ese rol', async () => {
      await createUser();
      await createUser();
      const courier = await createCourier();

      const couriers = expectSuccess(await api().get(`/api/users?role=${USER_ROLES.COURIER}`));
      expect(couriers.map((u) => u._id)).to.deep.equal([courier._id]);

      const clients = expectSuccess(await api().get(`/api/users?role=${USER_ROLES.USER}`));
      expect(clients).to.have.lengthOf(2);
      clients.forEach((u) => expect(u.role).to.equal(USER_ROLES.USER));
    });

    it('200: el filtro se combina con la paginación', async () => {
      await createUser();
      await createUser();
      await createUser();
      expect(expectSuccess(await api().get(`/api/users?role=${USER_ROLES.USER}&limit=2`))).to.have.lengthOf(2);
      expect(expectSuccess(await api().get(`/api/users?role=${USER_ROLES.USER}&limit=2&page=2`))).to.have.lengthOf(1);
    });

    it('400 INVALID_ROLE: rol inexistente', async () => {
      const body = expectError(await api().get('/api/users?role=HACKER'), {
        status: 400, code: ERROR_CODES.INVALID_ROLE, path: '/api/users?role=HACKER',
      });
      expect(body.details[0].allowed).to.have.members(Object.values(USER_ROLES));
    });
  });

  describe('filtros de pedidos', () => {
    async function seedOrders() {
      const ana = await createUser();
      const luis = await createUser();
      const anaHigh = await createOrder(ana._id, { priority: ORDER_PRIORITY.HIGH });
      const anaNormal = await createOrder(ana._id);
      const luisOrder = await createOrder(luis._id);
      expectSuccess(await api().patch(`/api/orders/${luisOrder._id}/status`).send({ status: ORDER_STATUS.CONFIRMED }));
      return { ana, luis, anaHigh, anaNormal, luisOrder };
    }
    const ids = (orders) => orders.map((o) => o._id);

    it('200: ?customer= devuelve solo los pedidos de ese cliente', async () => {
      const { ana, anaHigh, anaNormal } = await seedOrders();
      const orders = expectSuccess(await api().get(`/api/orders?customer=${ana._id}`));
      expect(ids(orders)).to.have.members([anaHigh._id, anaNormal._id]);
    });

    it('200: ?priority= y ?status= filtran', async () => {
      const { anaHigh, luisOrder } = await seedOrders();
      expect(ids(expectSuccess(await api().get(`/api/orders?priority=${ORDER_PRIORITY.HIGH}`)))).to.deep.equal([anaHigh._id]);
      expect(ids(expectSuccess(await api().get(`/api/orders?status=${ORDER_STATUS.CONFIRMED}`)))).to.deep.equal([luisOrder._id]);
    });

    it('200: los filtros se combinan; sin coincidencias devuelve lista vacía', async () => {
      const { ana, anaHigh } = await seedOrders();
      const both = expectSuccess(await api().get(`/api/orders?customer=${ana._id}&priority=${ORDER_PRIORITY.HIGH}`));
      expect(ids(both)).to.deep.equal([anaHigh._id]);

      const none = expectSuccess(await api().get(`/api/orders?customer=${ana._id}&status=${ORDER_STATUS.DELIVERED}`));
      expect(none).to.deep.equal([]);
    });

    it('400 INVALID_STATUS / INVALID_PRIORITY / INVALID_ID: filtros inválidos', async () => {
      expectError(await api().get('/api/orders?status=VOLANDO'), { status: 400, code: ERROR_CODES.INVALID_STATUS });
      expectError(await api().get('/api/orders?priority=YA'), { status: 400, code: ERROR_CODES.INVALID_PRIORITY });
      expectError(await api().get('/api/orders?customer=123'), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });

  describe('filtros de entregas', () => {
    it('200: ?status= y ?courier= filtran', async () => {
      const courier = await createCourier();
      const { order: orderA } = await createCustomerWithOrder();
      const { order: orderB } = await createCustomerWithOrder();
      const inTransit = await createDelivery(orderA._id);
      const pending = await createDelivery(orderB._id);
      expectSuccess(
        await api().patch(`/api/deliveries/${inTransit._id}`).send({ status: DELIVERY_STATUS.IN_TRANSIT, courier: courier._id })
      );

      const byStatus = expectSuccess(await api().get(`/api/deliveries?status=${DELIVERY_STATUS.IN_TRANSIT}`));
      expect(byStatus.map((d) => d._id)).to.deep.equal([inTransit._id]);

      const byCourier = expectSuccess(await api().get(`/api/deliveries?courier=${courier._id}`));
      expect(byCourier.map((d) => d._id)).to.deep.equal([inTransit._id]);

      const pendingList = expectSuccess(await api().get(`/api/deliveries?status=${DELIVERY_STATUS.PENDING}`));
      expect(pendingList.map((d) => d._id)).to.deep.equal([pending._id]);
    });

    it('400 INVALID_STATUS / INVALID_ID: filtros inválidos', async () => {
      expectError(await api().get('/api/deliveries?status=ROTO'), { status: 400, code: ERROR_CODES.INVALID_STATUS });
      expectError(await api().get('/api/deliveries?courier=xyz'), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });
});
