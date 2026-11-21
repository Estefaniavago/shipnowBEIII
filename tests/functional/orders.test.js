import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectObjectId, expectIsoDate } from './helpers/assertions.js';
import {
  createUser, createOrder, buildOrderBody, NON_EXISTENT_ID, INVALID_ID,
} from './helpers/factories.js';
import { ORDER_STATUS, ORDER_PRIORITY } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Orders - /api/orders', () => {
  describe('POST /api/orders', () => {
    it('201: crea un pedido PENDING con total calculado y prioridad NORMAL por defecto', async () => {
      const customer = await createUser();
      const body = buildOrderBody(customer._id);

      const order = expectSuccess(await api().post('/api/orders').send(body), 201);

      expect(order).to.include.all.keys(
        '_id', 'customer', 'items', 'total', 'status', 'priority', 'shippingAddress', 'createdAt', 'updatedAt'
      );
      expectObjectId(order._id);
      expectIsoDate(order.createdAt);
      expect(order.customer).to.equal(customer._id);
      expect(order.items).to.deep.equal(body.items);
      expect(order.total).to.equal(2 * 100 + 1 * 50);
      expect(order.status).to.equal(ORDER_STATUS.PENDING);
      expect(order.priority).to.equal(ORDER_PRIORITY.NORMAL);
      expect(order.shippingAddress).to.deep.equal(body.shippingAddress);
    });

    it('201: respeta la prioridad enviada', async () => {
      const customer = await createUser();
      const order = expectSuccess(
        await api().post('/api/orders').send(buildOrderBody(customer._id, { priority: ORDER_PRIORITY.URGENT })),
        201
      );
      expect(order.priority).to.equal(ORDER_PRIORITY.URGENT);
    });

    it('400 MISSING_FIELDS: body vacío', async () => {
      const body = expectError(await api().post('/api/orders').send({}), {
        status: 400, code: ERROR_CODES.MISSING_FIELDS,
      });
      expect(body.details.map((d) => d.field)).to.have.members(['customer', 'items', 'shippingAddress']);
    });

    it('400 INVALID_ID: customer con formato inválido', async () => {
      expectError(await api().post('/api/orders').send(buildOrderBody(INVALID_ID)), {
        status: 400, code: ERROR_CODES.INVALID_ID,
      });
    });

    it('404 USER_NOT_FOUND: el cliente no existe', async () => {
      expectError(await api().post('/api/orders').send(buildOrderBody(NON_EXISTENT_ID)), {
        status: 404, code: ERROR_CODES.USER_NOT_FOUND,
      });
    });

    it('400 VALIDATION_ERROR: items vacío', async () => {
      const customer = await createUser();
      const body = expectError(
        await api().post('/api/orders').send(buildOrderBody(customer._id, { items: [] })),
        { status: 400, code: ERROR_CODES.VALIDATION_ERROR }
      );
      expect(body.details[0]).to.include({ field: 'items' });
    });

    it('400 MISSING_FIELDS: item sin quantity ni unitPrice', async () => {
      const customer = await createUser();
      const body = expectError(
        await api().post('/api/orders').send(buildOrderBody(customer._id, { items: [{ name: 'X' }] })),
        { status: 400, code: ERROR_CODES.MISSING_FIELDS }
      );
      expect(body.details.map((d) => d.field)).to.have.members(['items[0].quantity', 'items[0].unitPrice']);
    });

    it('400 VALIDATION_ERROR: quantity no entera', async () => {
      const customer = await createUser();
      expectError(
        await api().post('/api/orders').send(
          buildOrderBody(customer._id, { items: [{ name: 'X', quantity: 1.5, unitPrice: 10 }] })
        ),
        { status: 400, code: ERROR_CODES.VALIDATION_ERROR }
      );
    });

    it('400 NEGATIVE_VALUE: unitPrice negativo', async () => {
      const customer = await createUser();
      expectError(
        await api().post('/api/orders').send(
          buildOrderBody(customer._id, { items: [{ name: 'X', quantity: 1, unitPrice: -10 }] })
        ),
        { status: 400, code: ERROR_CODES.NEGATIVE_VALUE }
      );
    });

    it('400 MISSING_FIELDS: dirección incompleta', async () => {
      const customer = await createUser();
      const body = expectError(
        await api().post('/api/orders').send(buildOrderBody(customer._id, { shippingAddress: { street: 'Mitre 1' } })),
        { status: 400, code: ERROR_CODES.MISSING_FIELDS }
      );
      expect(body.details[0]).to.include({ field: 'shippingAddress.city' });
    });

    it('400 INVALID_PRIORITY: prioridad fuera de las constantes', async () => {
      const customer = await createUser();
      const body = expectError(
        await api().post('/api/orders').send(buildOrderBody(customer._id, { priority: 'YA' })),
        { status: 400, code: ERROR_CODES.INVALID_PRIORITY }
      );
      expect(body.details[0].allowed).to.have.members(Object.values(ORDER_PRIORITY));
    });

    it('400 INVALID_JSON: body con JSON roto', async () => {
      expectError(await api().post('/api/orders').set('Content-Type', 'application/json').send('{"customer":'), {
        status: 400, code: ERROR_CODES.INVALID_JSON,
      });
    });
  });

  describe('GET /api/orders', () => {
    it('200: lista vacía cuando no hay pedidos', async () => {
      expect(expectSuccess(await api().get('/api/orders'))).to.be.an('array').that.is.empty;
    });

    it('200: lista los pedidos creados con su estructura', async () => {
      const customer = await createUser();
      const first = await createOrder(customer._id);
      const second = await createOrder(customer._id, { priority: ORDER_PRIORITY.HIGH });

      const orders = expectSuccess(await api().get('/api/orders'));

      expect(orders).to.have.lengthOf(2);
      expect(orders.map((o) => o._id)).to.have.members([first._id, second._id]);
      orders.forEach((order) => {
        expect(order).to.include.all.keys('_id', 'customer', 'items', 'total', 'status', 'priority', 'shippingAddress');
        expect(order.customer).to.equal(customer._id);
        expect(order.items).to.be.an('array').that.is.not.empty;
      });
    });

    it('200: respeta la paginación', async () => {
      const customer = await createUser();
      await createOrder(customer._id);
      await createOrder(customer._id);
      await createOrder(customer._id);

      expect(expectSuccess(await api().get('/api/orders?limit=2&page=1'))).to.have.lengthOf(2);
      expect(expectSuccess(await api().get('/api/orders?limit=2&page=2'))).to.have.lengthOf(1);
    });

    it('400 VALIDATION_ERROR: page=0', async () => {
      expectError(await api().get('/api/orders?page=0'), { status: 400, code: ERROR_CODES.VALIDATION_ERROR });
    });
  });

  describe('GET /api/orders/:id', () => {
    it('200: consulta un pedido por id', async () => {
      const customer = await createUser();
      const created = await createOrder(customer._id);

      const order = expectSuccess(await api().get(`/api/orders/${created._id}`));

      expect(order).to.include({ _id: created._id, customer: customer._id, total: 250, status: ORDER_STATUS.PENDING });
      expect(order.items).to.deep.equal(created.items);
    });

    it('404 ORDER_NOT_FOUND: id válido que no existe', async () => {
      const body = expectError(await api().get(`/api/orders/${NON_EXISTENT_ID}`), {
        status: 404, code: ERROR_CODES.ORDER_NOT_FOUND,
      });
      expect(body.details[0]).to.include({ field: 'id', value: NON_EXISTENT_ID });
    });

    it('400 INVALID_ID: id con formato inválido', async () => {
      expectError(await api().get(`/api/orders/${INVALID_ID}`), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    it('200: recorre todos los estados válidos y los persiste', async () => {
      const customer = await createUser();
      const created = await createOrder(customer._id);

      for (const status of Object.values(ORDER_STATUS)) {
        const order = expectSuccess(await api().patch(`/api/orders/${created._id}/status`).send({ status }));
        expect(order).to.include({ _id: created._id, status });
      }

      const persisted = expectSuccess(await api().get(`/api/orders/${created._id}`));
      expect(persisted.status).to.equal(Object.values(ORDER_STATUS).at(-1));
    });

    it('400 INVALID_STATUS: estado fuera de las constantes', async () => {
      const customer = await createUser();
      const created = await createOrder(customer._id);

      const body = expectError(await api().patch(`/api/orders/${created._id}/status`).send({ status: 'VOLANDO' }), {
        status: 400, code: ERROR_CODES.INVALID_STATUS,
      });
      expect(body.details[0].allowed).to.have.members(Object.values(ORDER_STATUS));

      // el pedido no cambió
      expect(expectSuccess(await api().get(`/api/orders/${created._id}`)).status).to.equal(ORDER_STATUS.PENDING);
    });

    it('400 MISSING_FIELDS: no se envía status', async () => {
      const customer = await createUser();
      const created = await createOrder(customer._id);
      const body = expectError(await api().patch(`/api/orders/${created._id}/status`).send({}), {
        status: 400, code: ERROR_CODES.MISSING_FIELDS,
      });
      expect(body.details[0]).to.include({ field: 'status' });
    });

    it('404 ORDER_NOT_FOUND', async () => {
      expectError(await api().patch(`/api/orders/${NON_EXISTENT_ID}/status`).send({ status: ORDER_STATUS.CONFIRMED }), {
        status: 404, code: ERROR_CODES.ORDER_NOT_FOUND,
      });
    });

    it('400 INVALID_ID', async () => {
      expectError(await api().patch(`/api/orders/${INVALID_ID}/status`).send({ status: ORDER_STATUS.CONFIRMED }), {
        status: 400, code: ERROR_CODES.INVALID_ID,
      });
    });

    it('400 INVALID_JSON', async () => {
      const customer = await createUser();
      const created = await createOrder(customer._id);
      expectError(
        await api().patch(`/api/orders/${created._id}/status`).set('Content-Type', 'application/json').send('{"status":'),
        { status: 400, code: ERROR_CODES.INVALID_JSON }
      );
    });
  });
});
