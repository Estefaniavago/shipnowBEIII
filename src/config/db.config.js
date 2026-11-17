import mongoose from 'mongoose';
import config from './index.js';
import logger from './logger.js';

export async function connectDB() {
  logger.debug('Conectando a MongoDB...');
  try {
    await mongoose.connect(config.mongoUri);
  } catch (error) {
    // No se loguea la URI: puede contener credenciales.
    throw new Error(`No se pudo conectar a MongoDB: ${error.message}`, { cause: error });
  }
  logger.info('Conexión a MongoDB establecida');

  mongoose.connection.on('disconnected', () => logger.warning('Conexión a MongoDB perdida'));
  mongoose.connection.on('reconnected', () => logger.info('Conexión a MongoDB restablecida'));
}
