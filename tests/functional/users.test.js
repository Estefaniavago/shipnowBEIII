import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectUserShape } from './helpers/assertions.js';
import { createUser, uniqueEmail, NON_EXISTENT_ID, INVALID_ID } from './helpers/factories.js';
import { USER_ROLES } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Users - /api/users', () => {
  describe('GET /api/users', () => {
    it('200: lista vacía cuando no hay usuarios', async () => {
      const users = expectSuccess(await api().get('/api/users'));
      expect(users).to.be.an('array').that.is.empty;
    });

    it('200: lista los usuarios creados con la estructura correcta y sin password', async () => {
      const a = await createUser({ name: 'Ana' });
      const b = await createUser({ name: 'Luis' });

      const users = expectSuccess(await api().get('/api/users'));

      expect(users).to.have.lengthOf(2);
      users.forEach(expectUserShape);
      expect(users.map((u) => u._id)).to.have.members([a._id, b._id]);
      expect(users.map((u) => u.name)).to.have.members(['Ana', 'Luis']);
    });

    it('200: respeta la paginación (limit y page)', async () => {
      await createUser();
      await createUser();
      await createUser();

      const firstPage = expectSuccess(await api().get('/api/users?limit=2&page=1'));
      const secondPage = expectSuccess(await api().get('/api/users?limit=2&page=2'));

      expect(firstPage).to.have.lengthOf(2);
      expect(secondPage).to.have.lengthOf(1);
    });

    it('400 VALIDATION_ERROR: page=0', async () => {
      const body = expectError(await api().get('/api/users?page=0'), {
        status: 400, code: ERROR_CODES.VALIDATION_ERROR, path: '/api/users?page=0',
      });
      expect(body.details[0]).to.include({ field: 'page' });
    });

    it('400 VALIDATION_ERROR: limit=1000 supera el máximo', async () => {
      const body = expectError(await api().get('/api/users?limit=1000'), {
        status: 400, code: ERROR_CODES.VALIDATION_ERROR,
      });
      expect(body.details[0]).to.include({ field: 'limit' });
    });
  });

  describe('POST /api/users', () => {
    it('201: crea un usuario con rol USER por defecto y sin exponer el password', async () => {
      const email = uniqueEmail('ana');
      const user = expectSuccess(
        await api().post('/api/users').send({ name: 'Ana Pérez', email, password: 'Test1234' }),
        201
      );

      expectUserShape(user);
      expect(user).to.include({ name: 'Ana Pérez', email, role: USER_ROLES.USER, isMock: false });
    });

    it('201: permite crear un repartidor (rol COURIER)', async () => {
      const user = expectSuccess(
        await api().post('/api/users').send({
          name: 'Rep', email: uniqueEmail(), password: 'Test1234', role: USER_ROLES.COURIER,
        }),
        201
      );
      expect(user.role).to.equal(USER_ROLES.COURIER);
    });

    it('400 MISSING_FIELDS: faltan campos obligatorios', async () => {
      const body = expectError(await api().post('/api/users').send({ name: 'Solo nombre' }), {
        status: 400, code: ERROR_CODES.MISSING_FIELDS,
      });
      expect(body.details.map((d) => d.field)).to.have.members(['email', 'password']);
    });

    it('400 VALIDATION_ERROR: password demasiado corto', async () => {
      const body = expectError(
        await api().post('/api/users').send({ name: 'X', email: uniqueEmail(), password: '123' }),
        { status: 400, code: ERROR_CODES.VALIDATION_ERROR }
      );
      expect(body.details[0]).to.include({ field: 'password' });
    });

    it('400 INVALID_ROLE: rol fuera de las constantes', async () => {
      const body = expectError(
        await api().post('/api/users').send({ name: 'X', email: uniqueEmail(), password: 'Test1234', role: 'HACKER' }),
        { status: 400, code: ERROR_CODES.INVALID_ROLE }
      );
      expect(body.details[0].allowed).to.have.members(Object.values(USER_ROLES));
    });

    it('409 EMAIL_ALREADY_EXISTS: email repetido', async () => {
      const existing = await createUser();
      const body = expectError(
        await api().post('/api/users').send({ name: 'Otro', email: existing.email, password: 'Test1234' }),
        { status: 409, code: ERROR_CODES.EMAIL_ALREADY_EXISTS }
      );
      expect(body.details[0]).to.include({ field: 'email', value: existing.email });
    });

    it('400 INVALID_JSON: body con JSON roto', async () => {
      expectError(
        await api().post('/api/users').set('Content-Type', 'application/json').send('{"name":'),
        { status: 400, code: ERROR_CODES.INVALID_JSON }
      );
    });
  });

  describe('GET /api/users/:id', () => {
    it('200: devuelve el usuario', async () => {
      const created = await createUser({ name: 'Buscado' });
      const user = expectSuccess(await api().get(`/api/users/${created._id}`));
      expectUserShape(user);
      expect(user).to.include({ _id: created._id, name: 'Buscado', email: created.email });
    });

    it('404 USER_NOT_FOUND: id válido que no existe', async () => {
      const body = expectError(await api().get(`/api/users/${NON_EXISTENT_ID}`), {
        status: 404, code: ERROR_CODES.USER_NOT_FOUND,
      });
      expect(body.details[0]).to.include({ field: 'id', value: NON_EXISTENT_ID });
    });

    it('400 INVALID_ID: id con formato inválido', async () => {
      expectError(await api().get(`/api/users/${INVALID_ID}`), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('200: actualiza nombre y rol', async () => {
      const created = await createUser({ name: 'Viejo' });
      const user = expectSuccess(
        await api().put(`/api/users/${created._id}`).send({ name: 'Nuevo', role: USER_ROLES.COURIER })
      );
      expectUserShape(user);
      expect(user).to.include({ _id: created._id, name: 'Nuevo', role: USER_ROLES.COURIER });
    });

    it('404 USER_NOT_FOUND', async () => {
      expectError(await api().put(`/api/users/${NON_EXISTENT_ID}`).send({ name: 'X' }), {
        status: 404, code: ERROR_CODES.USER_NOT_FOUND,
      });
    });

    it('400 INVALID_ID', async () => {
      expectError(await api().put(`/api/users/${INVALID_ID}`).send({ name: 'X' }), {
        status: 400, code: ERROR_CODES.INVALID_ID,
      });
    });

    it('400 INVALID_ROLE', async () => {
      const created = await createUser();
      expectError(await api().put(`/api/users/${created._id}`).send({ role: 'HACKER' }), {
        status: 400, code: ERROR_CODES.INVALID_ROLE,
      });
    });

    it('400 VALIDATION_ERROR: password demasiado corto', async () => {
      const created = await createUser();
      expectError(await api().put(`/api/users/${created._id}`).send({ password: '1' }), {
        status: 400, code: ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('409 DUPLICATE_KEY: cambiar el email por uno que ya usa otro usuario', async () => {
      const a = await createUser();
      const b = await createUser();
      const body = expectError(await api().put(`/api/users/${b._id}`).send({ email: a.email }), {
        status: 409, code: ERROR_CODES.DUPLICATE_KEY,
      });
      expect(body.details[0]).to.include({ field: 'email' });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('204: elimina el usuario (sin body) y luego ya no existe', async () => {
      const created = await createUser();

      const res = await api().delete(`/api/users/${created._id}`);
      expect(res.status).to.equal(204);
      expect(res.text).to.equal('');

      expectError(await api().get(`/api/users/${created._id}`), { status: 404, code: ERROR_CODES.USER_NOT_FOUND });
    });

    it('404 USER_NOT_FOUND', async () => {
      expectError(await api().delete(`/api/users/${NON_EXISTENT_ID}`), { status: 404, code: ERROR_CODES.USER_NOT_FOUND });
    });

    it('400 INVALID_ID', async () => {
      expectError(await api().delete(`/api/users/${INVALID_ID}`), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });
});
