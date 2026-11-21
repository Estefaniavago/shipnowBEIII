import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectObjectId, expectIsoDate } from './helpers/assertions.js';
import {
  createCourier, createCustomerWithOrder, createDelivery, createUser, NON_EXISTENT_ID, INVALID_ID,
} from './helpers/factories.js';
import { DELIVERY_STATUS } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Deliveries - /api/deliveries', () => {
  describe('POST /api/deliveries', () => {
    it('201: crea la entrega de un pedido en estado PENDING, sin repartidor y con tracking', async () => {
      const { order } = await createCustomerWithOrder();

      const delivery = expectSuccess(await api().post('/api/deliveries').send({ order: order._id }), 201);

      expect(delivery).to.include.all.keys(
        '_id', 'order', 'courier', 'status', 'trackingCode', 'scheduledAt', 'deliveredAt', 'createdAt', 'updatedAt'
      );
      expectObjectId(delivery._id);
      expect(delivery.order).to.equal(order._id);
      expect(delivery.courier).to.equal(null);
      expect(delivery.status).to.equal(DELIVERY_STATUS.PENDING);
      expect(delivery.trackingCode).to.match(/^SN-[0-9A-F]{8}$/);
      expectIsoDate(delivery.scheduledAt);
      expect(delivery.deliveredAt).to.equal(null);
    });

    it('201: asocia al repartidor cuando se envía', async () => {
      const { order } = await createCustomerWithOrder();
      const courier = await createCourier();

      const delivery = expectSuccess(
        await api().post('/api/deliveries').send({ order: order._id, courier: courier._id }),
        201
      );

      expect(delivery.courier).to.equal(courier._id);
    });

    it('201: respeta scheduledAt', async () => {
      const { order } = await createCustomerWithOrder();
      const scheduledAt = '2030-01-15T10:00:00.000Z';
      const delivery = expectSuccess(await api().post('/api/deliveries').send({ order: order._id, scheduledAt }), 201);
      expect(delivery.scheduledAt).to.equal(scheduledAt);
    });

    it('400 MISSING_FIELDS: no se envía order', async () => {
      const body = expectError(await api().post('/api/deliveries').send({}), {
        status: 400, code: ERROR_CODES.MISSING_FIELDS,
      });
      expect(body.details[0]).to.include({ field: 'order' });
    });

    it('400 INVALID_ID: order con formato inválido', async () => {
      expectError(await api().post('/api/deliveries').send({ order: INVALID_ID }), {
        status: 400, code: ERROR_CODES.INVALID_ID,
      });
    });

    it('404 ORDER_NOT_FOUND: el pedido no existe', async () => {
      expectError(await api().post('/api/deliveries').send({ order: NON_EXISTENT_ID }), {
        status: 404, code: ERROR_CODES.ORDER_NOT_FOUND,
      });
    });

    it('404 USER_NOT_FOUND: el repartidor no existe', async () => {
      const { order } = await createCustomerWithOrder();
      expectError(await api().post('/api/deliveries').send({ order: order._id, courier: NON_EXISTENT_ID }), {
        status: 404, code: ERROR_CODES.USER_NOT_FOUND,
      });
    });

    it('400 INVALID_ROLE: el usuario indicado como repartidor no tiene rol COURIER', async () => {
      const { order, customer } = await createCustomerWithOrder();
      expectError(await api().post('/api/deliveries').send({ order: order._id, courier: customer._id }), {
        status: 400, code: ERROR_CODES.INVALID_ROLE,
      });
    });

    it('400 VALIDATION_ERROR: scheduledAt no es una fecha', async () => {
      const { order } = await createCustomerWithOrder();
      const body = expectError(await api().post('/api/deliveries').send({ order: order._id, scheduledAt: 'mañana' }), {
        status: 400, code: ERROR_CODES.VALIDATION_ERROR,
      });
      expect(body.details[0]).to.include({ field: 'scheduledAt' });
    });

    it('409 DELIVERY_ALREADY_EXISTS: el pedido ya tiene entrega', async () => {
      const { order } = await createCustomerWithOrder();
      await createDelivery(order._id);

      const body = expectError(await api().post('/api/deliveries').send({ order: order._id }), {
        status: 409, code: ERROR_CODES.DELIVERY_ALREADY_EXISTS,
      });
      expect(body.details[0]).to.include({ field: 'order', value: order._id });
    });

    it('400 INVALID_JSON', async () => {
      expectError(await api().post('/api/deliveries').set('Content-Type', 'application/json').send('{"order":'), {
        status: 400, code: ERROR_CODES.INVALID_JSON,
      });
    });
  });

  describe('GET /api/deliveries', () => {
    it('200: lista vacía', async () => {
      expect(expectSuccess(await api().get('/api/deliveries'))).to.be.an('array').that.is.empty;
    });

    it('200: lista las entregas creadas', async () => {
      const { order: orderA } = await createCustomerWithOrder();
      const { order: orderB } = await createCustomerWithOrder();
      const a = await createDelivery(orderA._id);
      const b = await createDelivery(orderB._id);

      const deliveries = expectSuccess(await api().get('/api/deliveries'));

      expect(deliveries).to.have.lengthOf(2);
      expect(deliveries.map((d) => d._id)).to.have.members([a._id, b._id]);
      deliveries.forEach((d) => expect(d).to.include.all.keys('_id', 'order', 'courier', 'status', 'trackingCode'));
    });

    it('400 VALIDATION_ERROR: limit=0', async () => {
      expectError(await api().get('/api/deliveries?limit=0'), { status: 400, code: ERROR_CODES.VALIDATION_ERROR });
    });
  });

  describe('GET /api/deliveries/:id', () => {
    it('200: consulta una entrega', async () => {
      const { order } = await createCustomerWithOrder();
      const created = await createDelivery(order._id);

      const delivery = expectSuccess(await api().get(`/api/deliveries/${created._id}`));

      expect(delivery).to.include({ _id: created._id, order: order._id, trackingCode: created.trackingCode });
    });

    it('404 DELIVERY_NOT_FOUND', async () => {
      expectError(await api().get(`/api/deliveries/${NON_EXISTENT_ID}`), {
        status: 404, code: ERROR_CODES.DELIVERY_NOT_FOUND,
      });
    });

    it('400 INVALID_ID', async () => {
      expectError(await api().get(`/api/deliveries/${INVALID_ID}`), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });

  describe('PATCH /api/deliveries/:id', () => {
    async function pendingDelivery() {
      const { order } = await createCustomerWithOrder();
      return createDelivery(order._id);
    }

    it('200: asigna repartidor y pasa a IN_TRANSIT', async () => {
      const created = await pendingDelivery();
      const courier = await createCourier();

      const delivery = expectSuccess(
        await api().patch(`/api/deliveries/${created._id}`).send({ status: DELIVERY_STATUS.IN_TRANSIT, courier: courier._id })
      );

      expect(delivery).to.include({ _id: created._id, status: DELIVERY_STATUS.IN_TRANSIT, courier: courier._id });
      expect(delivery.deliveredAt).to.equal(null);
    });

    it('200: al pasar a DELIVERED completa deliveredAt', async () => {
      const created = await pendingDelivery();
      const courier = await createCourier();
      expectSuccess(await api().patch(`/api/deliveries/${created._id}`).send({ courier: courier._id }));

      const delivery = expectSuccess(
        await api().patch(`/api/deliveries/${created._id}`).send({ status: DELIVERY_STATUS.DELIVERED })
      );

      expect(delivery.status).to.equal(DELIVERY_STATUS.DELIVERED);
      expectIsoDate(delivery.deliveredAt);
    });

    it('200: FAILED no exige repartidor', async () => {
      const created = await pendingDelivery();
      const delivery = expectSuccess(
        await api().patch(`/api/deliveries/${created._id}`).send({ status: DELIVERY_STATUS.FAILED })
      );
      expect(delivery.status).to.equal(DELIVERY_STATUS.FAILED);
    });

    it('409 DELIVERY_COURIER_REQUIRED: IN_TRANSIT sin repartidor asignado', async () => {
      const created = await pendingDelivery();
      const body = expectError(
        await api().patch(`/api/deliveries/${created._id}`).send({ status: DELIVERY_STATUS.IN_TRANSIT }),
        { status: 409, code: ERROR_CODES.DELIVERY_COURIER_REQUIRED }
      );
      expect(body.details[0]).to.include({ field: 'courier', status: DELIVERY_STATUS.IN_TRANSIT });

      // la entrega no cambió
      expect(expectSuccess(await api().get(`/api/deliveries/${created._id}`)).status).to.equal(DELIVERY_STATUS.PENDING);
    });

    it('400 INVALID_STATUS: estado fuera de las constantes', async () => {
      const created = await pendingDelivery();
      const body = expectError(await api().patch(`/api/deliveries/${created._id}`).send({ status: 'VOLANDO' }), {
        status: 400, code: ERROR_CODES.INVALID_STATUS,
      });
      expect(body.details[0].allowed).to.have.members(Object.values(DELIVERY_STATUS));
    });

    it('400 VALIDATION_ERROR: body sin status ni courier', async () => {
      const created = await pendingDelivery();
      expectError(await api().patch(`/api/deliveries/${created._id}`).send({}), {
        status: 400, code: ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('400 INVALID_ROLE: el courier indicado no tiene rol COURIER', async () => {
      const created = await pendingDelivery();
      const client = await createUser();
      expectError(await api().patch(`/api/deliveries/${created._id}`).send({ courier: client._id }), {
        status: 400, code: ERROR_CODES.INVALID_ROLE,
      });
    });

    it('404 USER_NOT_FOUND: el courier no existe', async () => {
      const created = await pendingDelivery();
      expectError(await api().patch(`/api/deliveries/${created._id}`).send({ courier: NON_EXISTENT_ID }), {
        status: 404, code: ERROR_CODES.USER_NOT_FOUND,
      });
    });

    it('404 DELIVERY_NOT_FOUND y 400 INVALID_ID', async () => {
      expectError(await api().patch(`/api/deliveries/${NON_EXISTENT_ID}`).send({ status: DELIVERY_STATUS.FAILED }), {
        status: 404, code: ERROR_CODES.DELIVERY_NOT_FOUND,
      });
      expectError(await api().patch(`/api/deliveries/${INVALID_ID}`).send({ status: DELIVERY_STATUS.FAILED }), {
        status: 400, code: ERROR_CODES.INVALID_ID,
      });
    });

    it('400 INVALID_JSON', async () => {
      const created = await pendingDelivery();
      expectError(
        await api().patch(`/api/deliveries/${created._id}`).set('Content-Type', 'application/json').send('{"status":'),
        { status: 400, code: ERROR_CODES.INVALID_JSON }
      );
    });
  });
});
