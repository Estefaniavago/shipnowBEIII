import dotenv from 'dotenv';
import { NODE_ENVS, LOG_LEVELS, LOG_LEVEL_BY_ENV, LOG_DEFAULTS } from '../constants/index.js';

dotenv.config();

const REQUIRED_VARS = ['PORT', 'MONGODB_URI', 'NODE_ENV'];
const VALID_ENVIRONMENTS = Object.values(NODE_ENVS);

const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  throw new Error(
    `[Config] Faltan variables de entorno obligatorias: ${missing.join(', ')}. ` +
      'Revisá tu archivo .env (podés basarte en .env.example).'
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

const config = Object.freeze({
  port,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
  logLevel: customLogLevel || LOG_LEVEL_BY_ENV[process.env.NODE_ENV],
  logDir: LOG_DEFAULTS.DIR,
});

export default config;
