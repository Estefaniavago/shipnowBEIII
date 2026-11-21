import { rm } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

// Hooks globales de Mocha (root hook plugin) para los tests funcionales:
//  - beforeAll : valida que la base sea de testing, conecta y prepara los índices.
//  - beforeEach: vacía TODAS las colecciones y la carpeta de uploads de testing, así cada test
//                arranca desde cero y no depende del orden ni del estado que dejó otro test.
//  - afterAll  : elimina la base de testing y los archivos subidos, y cierra la conexión.

const DB_NAME_REGEX = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/;

// Guardia de seguridad: nunca correr los tests contra una base que no sea de testing.
function assertTestDatabase(uri) {
  const dbName = uri.match(DB_NAME_REGEX)?.[1] ?? '';
  if (!/test/i.test(dbName)) {
    throw new Error(
      `[tests] Por seguridad, la base de datos de testing debe tener "test" en su nombre ` +
        `(recibido: "${dbName || 'sin nombre'}"). Revisá MONGODB_URI en .env.test.`
    );
  }
  return dbName;
}

let uploadDir = null;

// Guardia de seguridad: solo se borra la carpeta de uploads si es de testing.
function assertTestUploadDir(dir) {
  if (!/test/i.test(path.basename(dir))) {
    throw new Error(
      `[tests] Por seguridad, la carpeta de uploads de testing debe tener "test" en su nombre ` +
        `(recibida: "${dir}"). Revisá UPLOAD_DIR en .env.test.`
    );
  }
}

export async function clearUploads() {
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
}

export async function clearDatabase() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export const mochaHooks = {
  async beforeAll() {
    this.timeout(30000);
    const { default: config } = await import('../../src/config/index.js');
    assertTestDatabase(config.mongoUri);
    assertTestUploadDir(config.upload.dir);
    uploadDir = config.upload.dir;

    await import('../../src/app.js'); // registra los modelos de Mongoose
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    } catch (error) {
      throw new Error(
        `[tests] No se pudo conectar a MongoDB de testing. ¿Está corriendo MongoDB? (${error.message})`
      );
    }
    // Garantiza que los índices únicos (ej. email) existan antes del primer test.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    await clearDatabase();
    await clearUploads();
  },

  async beforeEach() {
    await clearDatabase();
    await clearUploads();
  },

  async afterAll() {
    await mongoose.connection.dropDatabase();
    await clearUploads();
    await mongoose.disconnect();
  },
};
