import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { NODE_ENVS, LOG_LEVELS, LOG_LEVEL_BY_ENV, LOG_DEFAULTS, UPLOAD_DEFAULTS } from '../constants/index.js';

// Entorno de testing separado: con NODE_ENV=test se lee .env.test (otra base de datos).
// Las variables ya definidas en el sistema tienen prioridad sobre el archivo.
const isTestEnv = process.env.NODE_ENV === NODE_ENVS.TEST;
const envFile = isTestEnv ? '../../.env.test' : '../../.env';
dotenv.config({ path: fileURLToPath(new URL(envFile, import.meta.url)) });

const REQUIRED_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV'];
const VALID_ENVIRONMENTS = Object.values(NODE_ENVS);

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(
    `[Config] Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
      `Revisá tu archivo ${isTestEnv ? '.env.test' : '.env'} (podés basarte en .env.example).`
  );
}

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`[Config] PORT debe ser un número entero positivo (recibido: "${process.env.PORT}").`);
}

if (!VALID_ENVIRONMENTS.includes(process.env.NODE_ENV)) {
  throw new Error(
    `[Config] NODE_ENV inválido ("${process.env.NODE_ENV}"). Valores permitidos: ${VALID_ENVIRONMENTS.join(', ')}.`
  );
}

// LOG_LEVEL es opcional: si no se define, el nivel depende de NODE_ENV.
const customLogLevel = process.env.LOG_LEVEL?.trim();
if (customLogLevel && !Object.values(LOG_LEVELS).includes(customLogLevel)) {
  throw new Error(
    `[Config] LOG_LEVEL inválido ("${customLogLevel}"). Valores permitidos: ${Object.values(LOG_LEVELS).join(', ')}.`
  );
}

// Carga de archivos (opcional): UPLOAD_DIR y UPLOAD_MAX_FILE_SIZE_MB.
const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const uploadDir = process.env.UPLOAD_DIR?.trim() || UPLOAD_DEFAULTS.DIR;
const rawMaxSize = process.env.UPLOAD_MAX_FILE_SIZE_MB?.trim();
const maxFileSizeMb = rawMaxSize ? Number(rawMaxSize) : UPLOAD_DEFAULTS.MAX_FILE_SIZE_MB;
if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb <= 0) {
  throw new Error(`[Config] UPLOAD_MAX_FILE_SIZE_MB debe ser un número mayor a 0 (recibido: "${rawMaxSize}").`);
}

const config = Object.freeze({
  port,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
  logLevel: customLogLevel || LOG_LEVEL_BY_ENV[process.env.NODE_ENV],
  logDir: LOG_DEFAULTS.DIR,
  upload: Object.freeze({
    dir: path.resolve(projectRoot, uploadDir),
    maxFileSizeMb,
    maxFileSizeBytes: Math.round(maxFileSizeMb * 1024 * 1024),
  }),
});

export default config;
