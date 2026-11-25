import mongoose from 'mongoose';
import config from './index.js';
import logger from './logger.js';
import { DATABASE_STATES } from '../constants/index.js';

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

// Estado de la conexión (para el health check). No expone la URI ni credenciales.
const STATES_BY_READY_STATE = {
  0: DATABASE_STATES.DISCONNECTED,
  1: DATABASE_STATES.CONNECTED,
  2: DATABASE_STATES.CONNECTING,
  3: DATABASE_STATES.DISCONNECTING,
};

export function getDatabaseState() {
  return STATES_BY_READY_STATE[mongoose.connection.readyState] ?? DATABASE_STATES.DISCONNECTED;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
