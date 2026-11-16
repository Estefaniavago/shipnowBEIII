import crypto from 'node:crypto';
import {
  USER_ROLES,
  ORDER_STATUS,
  ORDER_PRIORITY,
  ORDER_TO_DELIVERY_STATUS,
  DELIVERY_STATUS,
  MOCK,
} from '../constants/index.js';

const FIRST_NAMES = ['Ana', 'Luis', 'María', 'Carlos', 'Lucía', 'Juan', 'Sofía', 'Mateo', 'Valentina', 'Diego', 'Camila', 'Nicolás', 'Paula', 'Tomás'];
const LAST_NAMES = ['Pérez', 'Gómez', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Díaz', 'Sánchez', 'Romero', 'Álvarez', 'Torres', 'Ruiz'];
const PRODUCTS = [
  { name: 'Caja chica', price: 1500 },
  { name: 'Caja mediana', price: 2500 },
  { name: 'Caja grande', price: 4000 },
  { name: 'Sobre acolchado', price: 900 },
  { name: 'Cinta de embalar', price: 700 },
  { name: 'Bolsa de envío', price: 500 },
];
const STREETS = ['Av. Argentina', 'Belgrano', 'Mitre', 'Av. Olascoaga', 'San Martín', 'Roca', 'Rivadavia'];
const CITIES = ['Neuquén', 'Plottier', 'Centenario', 'Cipolletti', 'Buenos Aires', 'Córdoba'];

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const slug = (text) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');

// Id con formato ObjectId (24 hex) sin depender de Mongoose.
export const createId = () => crypto.randomBytes(12).toString('hex');

export function generateUsers(qty, { role = USER_ROLES.USER } = {}) {
  if (!Object.values(USER_ROLES).includes(role)) throw new Error(`Rol inválido: ${role}`);
  const usedEmails = new Set();
  const users = [];
  while (users.length < qty) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const email = `${slug(firstName)}.${slug(lastName)}.${int(100, 9999)}@${MOCK.EMAIL_DOMAIN}`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    users.push({ _id: createId(), name: `${firstName} ${lastName}`, email, role, isMock: true });
  }
  return users;
}

export function generateOrder({ customerId, status } = {}) {
  if (!customerId) throw new Error('generateOrder requiere customerId');
  const items = Array.from({ length: int(1, 3) }, () => {
    const product = pick(PRODUCTS);
    return { name: product.name, quantity: int(1, 5), unitPrice: product.price };
  });
  return {
    _id: createId(),
    customer: customerId,
    items,
    total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    status: status ?? pick(Object.values(ORDER_STATUS)),
    priority: pick(Object.values(ORDER_PRIORITY)),
    shippingAddress: { street: `${pick(STREETS)} ${int(1, 2500)}`, city: pick(CITIES) },
    isMock: true,
  };
}

// Solo los pedidos CONFIRMED, IN_TRANSIT y DELIVERED tienen entrega.
export const canHaveDelivery = (order) => order.status in ORDER_TO_DELIVERY_STATUS;

export function generateDelivery({ order, courierId = null }) {
  if (!canHaveDelivery(order)) {
    throw new Error(`Un pedido ${order.status} no puede tener entrega`);
  }
  const status = ORDER_TO_DELIVERY_STATUS[order.status];
  const scheduledAt = new Date(Date.now() + int(-3, 3) * 24 * 60 * 60 * 1000);
  // Sin repartidor solo mientras la entrega está pendiente de asignación.
  if (status !== DELIVERY_STATUS.PENDING && !courierId) {
    throw new Error(`Una entrega ${status} requiere un repartidor`);
  }
  return {
    _id: createId(),
    order: order._id,
    courier: status === DELIVERY_STATUS.PENDING ? null : courierId,
    status,
    trackingCode: `SN-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    scheduledAt,
    deliveredAt: status === DELIVERY_STATUS.DELIVERED ? scheduledAt : null,
    isMock: true,
  };
}
