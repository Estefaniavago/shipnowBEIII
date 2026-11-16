import dotenv from 'dotenv';
import { NODE_ENVS } from '../constants/index.js';

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

const config = Object.freeze({
  port,
  mongoUri: process.env.MONGODB_URI,
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === NODE_ENVS.PRODUCTION,
});

export default config;
