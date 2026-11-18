import { expect } from 'chai';
import request from 'supertest';
import mongoose from 'mongoose';
import {
  app, UserModel, OrderModel, DeliveryModel, ProductModel, clearDatabase,
} from './helpers/test-context.js';

describe('ShipNow API - tests funcionales', function () {
  this.timeout(15000);
  let customerId;
  let courierId;
  let orderId;

  const userData = (email = 'cliente-test@shipnow.test', role = 'USER') => ({
    name: 'Cliente de prueba', email, password: 'Test1234', role,
  });

  async function createCustomer() {
    const response = await request(app).post('/api/users').send(userData());
    expect(response.status).to.equal(201);
    customerId = response.body.payload._id;
    return customerId;
  }

  async function createOrder() {
    if (!customerId) await createCustomer();
    const response = await request(app).post('/api/orders').send({
      customer: customerId,
      items: [{ name: 'Caja de prueba', quantity: 2, unitPrice: 150 }],
      shippingAddress: { street: 'Calle de prueba 123', city: 'Neuquén' },
    });
    expect(response.status).to.equal(201);
    orderId = response.body.payload._id;
    return orderId;
  }

  beforeEach(async () => {
    await clearDatabase();
    customerId = undefined;
    courierId = undefined;
    orderId = undefined;
  });

  after(async () => {
    await clearDatabase();
    await mongoose.disconnect();
  });

  describe('Users', () => {
    it('GET /api/users devuelve un listado con estructura success/payload', async () => {
      await createCustomer();
      const res = await request(app).get('/api/users');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('status', 'success');
      expect(res.body.payload).to.be.an('array').with.length(1);
      expect(res.body.payload[0]).to.include.keys('_id', 'name', 'email', 'role');
      expect(res.body.payload[0]).not.to.have.property('password');
    });

    it('POST /api/users crea un usuario y devuelve sus propiedades públicas', async () => {
      const res = await request(app).post('/api/users').send(userData());
      expect(res.status).to.equal(201);
      expect(res.body.status).to.equal('success');
      expect(res.body.payload).to.include({ name: 'Cliente de prueba', email: 'cliente-test@shipnow.test', role: 'USER' });
      expect(res.body.payload).to.have.property('_id');
      expect(res.body.payload).not.to.have.property('password');
    });

    it('POST /api/users rechaza datos incompletos con error estructurado', async () => {
      const res = await request(app).post('/api/users').send({ name: 'Incompleto' });
      expect(res.status).to.equal(400);
      expect(res.body).to.include({ status: 'error', code: 'MISSING_FIELDS' });
      expect(res.body.message).to.be.a('string');
      expect(res.body.details).to.be.an('array');
    });

    it('GET /api/users/:id devuelve 404 para un usuario inexistente', async () => {
      const missingId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/api/users/${missingId}`);
      expect(res.status).to.equal(404);
      expect(res.body).to.include({ status: 'error', code: 'USER_NOT_FOUND' });
      expect(res.body).to.have.property('message').that.is.a('string');
    });
  });

  describe('Orders', () => {
    it('GET /api/orders devuelve un listado correctamente estructurado', async () => {
      await createOrder();
      const res = await request(app).get('/api/orders');
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.payload).to.be.an('array').with.length(1);
      expect(res.body.payload[0]).to.include.keys('_id', 'customer', 'items', 'total', 'status');
    });

    it('POST /api/orders crea un pedido válido y calcula el total', async () => {
      await createCustomer();
      const res = await request(app).post('/api/orders').send({
        customer: customerId,
        items: [{ name: 'Producto', quantity: 2, unitPrice: 125 }],
        shippingAddress: { street: 'Mitre 100', city: 'Neuquén' },
      });
      expect(res.status).to.equal(201);
      expect(res.body.status).to.equal('success');
      expect(res.body.payload).to.include({ total: 250, status: 'PENDING' });
      expect(res.body.payload.items).to.have.length(1);
      expect(res.body.payload.items[0]).to.include({ name: 'Producto', quantity: 2, unitPrice: 125 });
      orderId = res.body.payload._id;
    });

    it('POST /api/orders rechaza un pedido incompleto', async () => {
      const res = await request(app).post('/api/orders').send({ items: [] });
      expect(res.status).to.equal(400);
      expect(res.body).to.include({ status: 'error', code: 'MISSING_FIELDS' });
      expect(res.body.details).to.be.an('array');
    });

    it('GET /api/orders/:id devuelve el pedido creado', async () => {
      await createOrder();
      const res = await request(app).get(`/api/orders/${orderId}`);
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.payload).to.include({ _id: orderId, status: 'PENDING', total: 300 });
    });

    it('GET /api/orders/:id devuelve 404 si el pedido no existe', async () => {
      const res = await request(app).get(`/api/orders/${new mongoose.Types.ObjectId()}`);
      expect(res.status).to.equal(404);
      expect(res.body).to.include({ status: 'error', code: 'ORDER_NOT_FOUND' });
      expect(res.body.details).to.be.an('array');
    });

    it('PATCH /api/orders/:id/status actualiza el estado y devuelve el pedido', async () => {
      await createOrder();
      const res = await request(app).patch(`/api/orders/${orderId}/status`).send({ status: 'CONFIRMED' });
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.payload).to.include({ _id: orderId, status: 'CONFIRMED' });
    });

    it('PATCH /api/orders/:id/status rechaza un estado inválido', async () => {
      await createOrder();
      const res = await request(app).patch(`/api/orders/${orderId}/status`).send({ status: 'INVENTADO' });
      expect(res.status).to.equal(400);
      expect(res.body).to.include({ status: 'error', code: 'INVALID_STATUS' });
      expect(res.body.message).to.be.a('string');
    });
  });

  describe('Deliveries', () => {
    it('POST /api/deliveries crea una entrega asociada a un pedido', async () => {
      await createOrder();
      const res = await request(app).post('/api/deliveries').send({ order: orderId });
      expect(res.status).to.equal(201);
      expect(res.body.status).to.equal('success');
      expect(res.body.payload).to.include.keys('_id', 'order', 'status', 'trackingCode', 'scheduledAt');
      expect(res.body.payload.status).to.equal('PENDING');
    });

    it('GET /api/deliveries devuelve un listado con estructura válida', async () => {
      await createOrder();
      await request(app).post('/api/deliveries').send({ order: orderId }).expect(201);
      const res = await request(app).get('/api/deliveries');
      expect(res.status).to.equal(200);
      expect(res.body.status).to.equal('success');
      expect(res.body.payload).to.be.an('array').with.length(1);
      expect(res.body.payload[0]).to.include.keys('_id', 'order', 'status', 'trackingCode');
    });

    it('POST /api/deliveries rechaza la falta de order', async () => {
      const res = await request(app).post('/api/deliveries').send({});
      expect(res.status).to.equal(400);
      expect(res.body).to.include({ status: 'error', code: 'MISSING_FIELDS' });
    });
  });

  describe('Mocks', () => {
    it('GET /api/mocks/users genera usuarios simulados con la cantidad solicitada', async () => {
      const res = await request(app).get('/api/mocks/users?qty=2');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array').with.length(2);
      expect(res.body[0]).to.include.keys('_id', 'name', 'email', 'role');
    });

    it('GET /api/mocks/orders genera pedidos simulados', async () => {
      const res = await request(app).get('/api/mocks/orders?qty=2');
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array').with.length(2);
      expect(res.body[0]).to.include.keys('_id', 'customer', 'items', 'total', 'status');
    });

    it('GET /api/mocks/users rechaza cantidades inválidas', async () => {
      const res = await request(app).get('/api/mocks/users?qty=-2');
      expect(res.status).to.equal(400);
      expect(res.body).to.include({ status: 'error', code: 'MOCK_QTY_NEGATIVE' });
      expect(res.body.message).to.be.a('string');
      expect(res.body).to.have.property('path');
    });

    it('POST /api/mocks/seed inserta datos de prueba y DELETE /seed los limpia', async () => {
      const seeded = await request(app).post('/api/mocks/seed?qty=2&type=users');
      expect(seeded.status).to.equal(201);
      expect(seeded.body).to.have.property('insertados');
      expect(seeded.body.insertados).to.equal(2);
      const listed = await request(app).get('/api/users');
      expect(listed.body.payload).to.have.length(2);
      const cleared = await request(app).delete('/api/mocks/seed');
      expect(cleared.status).to.equal(200);
      expect(cleared.body).to.have.property('eliminados');
      expect(await UserModel.countDocuments()).to.equal(0);
    });
  });

  describe('Logger, Swagger y rutas', () => {
    it('GET /api/logger/test devuelve confirmación de los niveles emitidos', async () => {
      const res = await request(app).get('/api/logger/test');
      expect(res.status).to.equal(200);
      expect(res.body).to.include({ status: 'success' });
      expect(res.body.message).to.be.a('string');
      expect(res.body.payload.nivelesEmitidos).to.be.an('array').that.is.not.empty;
    });

    it('GET /api/docs responde con la interfaz Swagger', async () => {
      const res = await request(app).get('/api/docs/');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('swagger-ui');
    });

    it('GET /api/docs/openapi.json devuelve OpenAPI 3', async () => {
      const res = await request(app).get('/api/docs/openapi.json');
      expect(res.status).to.equal(200);
      expect(res.body.openapi).to.match(/^3\./);
      expect(res.body.info.title).to.include('ShipNow');
      expect(res.body).to.have.property('paths');
    });

    it('una ruta inexistente devuelve 404 con ROUTE_NOT_FOUND', async () => {
      const res = await request(app).get('/api/no-existe');
      expect(res.status).to.equal(404);
      expect(res.body).to.include({ status: 'error', code: 'ROUTE_NOT_FOUND' });
      expect(res.body.message).to.be.a('string');
      expect(res.body.details).to.be.an('array');
    });
  });
});
