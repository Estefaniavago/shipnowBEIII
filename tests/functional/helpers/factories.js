import { expect } from 'chai';
import { api } from './api.js';
import { USER_ROLES } from '../../../src/constants/index.js';

// Ids con formato válido pero que no existen / con formato inválido.
export const NON_EXISTENT_ID = '0'.repeat(24);
export const INVALID_ID = '123';

let counter = 0;
export const uniqueEmail = (prefix = 'user') => `${prefix}.${Date.now()}.${++counter}@test.com`;

// Todas las factorías crean los datos a través de la API real (sin tocar la base a mano).
async function createdPayload(res, what) {
  expect(res.status, `crear ${what}: ${JSON.stringify(res.body)}`).to.equal(201);
  return res.body.payload;
}

export async function createUser(overrides = {}) {
  const res = await api()
    .post('/api/users')
    .send({ name: 'Usuario Test', email: uniqueEmail(), password: 'Test1234', ...overrides });
  return createdPayload(res, 'usuario');
}

export const createCourier = (overrides = {}) =>
  createUser({ name: 'Repartidor Test', role: USER_ROLES.COURIER, ...overrides });

export async function createProduct(overrides = {}) {
  const res = await api().post('/api/products').send({ name: 'Caja mediana', price: 2500, stock: 10, ...overrides });
  return createdPayload(res, 'producto');
}

export const buildOrderBody = (customerId, overrides = {}) => ({
  customer: customerId,
  items: [
    { name: 'Caja', quantity: 2, unitPrice: 100 },
    { name: 'Cinta', quantity: 1, unitPrice: 50 },
  ],
  shippingAddress: { street: 'Mitre 123', city: 'Neuquén' },
  ...overrides,
});

export async function createOrder(customerId, overrides = {}) {
  const res = await api().post('/api/orders').send(buildOrderBody(customerId, overrides));
  return createdPayload(res, 'pedido');
}

export async function createDelivery(orderId, extra = {}) {
  const res = await api().post('/api/deliveries').send({ order: orderId, ...extra });
  return createdPayload(res, 'entrega');
}

// Atajo: un cliente con un pedido listo para usar.
export async function createCustomerWithOrder(orderOverrides = {}) {
  const customer = await createUser();
  const order = await createOrder(customer._id, orderOverrides);
  return { customer, order };
}
