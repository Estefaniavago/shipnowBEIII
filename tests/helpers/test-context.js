import dotenv from 'dotenv';
import mongoose from 'mongoose';

// El entorno de pruebas se carga antes de importar la app/configuración.
process.env.NODE_ENV = 'test';
dotenv.config({ path: '.env.test' });
process.env.PORT ??= '3001';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/shipnow_test';
process.env.LOG_LEVEL ??= 'fatal';

export const { default: app } = await import('../../src/app.js');
await mongoose.connect(process.env.MONGODB_URI);
export const { UserModel } = await import('../../src/models/user.model.js');
export const { OrderModel } = await import('../../src/models/order.model.js');
export const { DeliveryModel } = await import('../../src/models/delivery.model.js');
export const { ProductModel } = await import('../../src/models/product.model.js');

export async function clearDatabase() {
  await Promise.all([
    UserModel.deleteMany({}),
    OrderModel.deleteMany({}),
    DeliveryModel.deleteMany({}),
    ProductModel.deleteMany({}),
  ]);
}
