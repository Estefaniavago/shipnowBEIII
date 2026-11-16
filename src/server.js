// config se importa primero: si falta una variable crítica, la app no arranca.
import config from './config/index.js';
import app from './app.js';
import { connectDB } from './config/db.config.js';

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`[Server] ShipNow API en http://localhost:${config.port} (${config.nodeEnv})`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
