import { expect } from 'chai';
import { ERROR_DICTIONARY } from '../../../src/errors/index.js';

const OBJECT_ID = /^[0-9a-f]{24}$/;
export const expectObjectId = (value) => expect(value).to.match(OBJECT_ID);
export const expectIsoDate = (value) => expect(Number.isNaN(Date.parse(value))).to.equal(false);

/**
 * Valida una respuesta exitosa con el formato { status: "success", payload } y devuelve el payload.
 */
export function expectSuccess(res, statusCode = 200) {
  expect(res.status).to.equal(statusCode);
  expect(res.type).to.equal('application/json');
  expect(res.body).to.have.all.keys('status', 'payload');
  expect(res.body.status).to.equal('success');
  return res.body.payload;
}

/**
 * Valida una respuesta de error con el formato definido en el módulo de errores:
 * { status, code, message, details, path, timestamp } y el status HTTP del diccionario.
 * Devuelve el body para poder inspeccionar `details`.
 */
export function expectError(res, { status, code, path }) {
  expect(res.status, `status HTTP (body: ${JSON.stringify(res.body)})`).to.equal(status);
  expect(ERROR_DICTIONARY[code], `el código ${code} existe en el diccionario`).to.exist;
  expect(ERROR_DICTIONARY[code].status, `el diccionario asigna ${status} a ${code}`).to.equal(status);

  expect(res.type).to.equal('application/json');
  expect(res.body).to.have.all.keys('status', 'code', 'message', 'details', 'path', 'timestamp');
  expect(res.body.status).to.equal('error');
  expect(res.body.code).to.equal(code);
  expect(res.body.message).to.be.a('string');
  expect(res.body.message.length).to.be.greaterThan(0);
  expect(res.body.details).to.be.an('array');
  expect(res.body.path).to.be.a('string');
  if (path) expect(res.body.path).to.equal(path);
  expectIsoDate(res.body.timestamp);
  return res.body;
}

export function expectUserShape(user) {
  expect(user).to.include.all.keys('_id', 'name', 'email', 'role', 'createdAt', 'updatedAt');
  expectObjectId(user._id);
  expect(user).to.not.have.property('password');
  expect(user).to.not.have.property('__v');
}
