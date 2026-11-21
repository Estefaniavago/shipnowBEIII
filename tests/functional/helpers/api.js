import request from 'supertest';
import app from '../../../src/app.js';

// La app de Express se importa directamente (sin server.js): Supertest abre un puerto
// efímero por cada petición, no hay que levantar el servidor a mano.
export const api = () => request(app);
