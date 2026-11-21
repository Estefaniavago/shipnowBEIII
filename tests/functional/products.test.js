import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError, expectSuccess, expectObjectId } from './helpers/assertions.js';
import { createProduct, NON_EXISTENT_ID, INVALID_ID } from './helpers/factories.js';
import { PRODUCT_STATUS } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Products - /api/products', () => {
  describe('POST /api/products', () => {
    it('201: crea un producto AVAILABLE cuando hay stock', async () => {
      const product = expectSuccess(
        await api().post('/api/products').send({ name: 'Caja mediana', price: 2500, stock: 40 }),
        201
      );
      expect(product).to.include.all.keys('_id', 'name', 'description', 'price', 'stock', 'status', 'createdAt', 'updatedAt');
      expectObjectId(product._id);
      expect(product).to.include({ name: 'Caja mediana', price: 2500, stock: 40, status: PRODUCT_STATUS.AVAILABLE });
    });

    it('201: sin stock queda OUT_OF_STOCK (stock 0 por defecto)', async () => {
      const product = expectSuccess(await api().post('/api/products').send({ name: 'Sin stock', price: 10 }), 201);
      expect(product).to.include({ stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK });
    });

    it('400 MISSING_FIELDS: faltan name y price', async () => {
      const body = expectError(await api().post('/api/products').send({}), {
        status: 400, code: ERROR_CODES.MISSING_FIELDS,
      });
      expect(body.details.map((d) => d.field)).to.have.members(['name', 'price']);
    });

    it('400 VALIDATION_ERROR: price no numérico', async () => {
      const body = expectError(await api().post('/api/products').send({ name: 'X', price: 'abc' }), {
        status: 400, code: ERROR_CODES.VALIDATION_ERROR,
      });
      expect(body.details[0]).to.include({ field: 'price' });
    });

    it('400 NEGATIVE_VALUE: precio y stock negativos', async () => {
      expectError(await api().post('/api/products').send({ name: 'X', price: -5 }), {
        status: 400, code: ERROR_CODES.NEGATIVE_VALUE,
      });
      expectError(await api().post('/api/products').send({ name: 'X', price: 5, stock: -1 }), {
        status: 400, code: ERROR_CODES.NEGATIVE_VALUE,
      });
    });

    it('400 INVALID_JSON', async () => {
      expectError(await api().post('/api/products').set('Content-Type', 'application/json').send('{"name":'), {
        status: 400, code: ERROR_CODES.INVALID_JSON,
      });
    });
  });

  describe('GET /api/products', () => {
    it('200: lista vacía', async () => {
      expect(expectSuccess(await api().get('/api/products'))).to.be.an('array').that.is.empty;
    });

    it('200: por defecto excluye los sin stock; includeOutOfStock=true los incluye', async () => {
      const withStock = await createProduct({ name: 'Con stock', stock: 5 });
      const noStock = await createProduct({ name: 'Sin stock', stock: 0 });

      const defaultList = expectSuccess(await api().get('/api/products'));
      expect(defaultList.map((p) => p._id)).to.deep.equal([withStock._id]);

      const fullList = expectSuccess(await api().get('/api/products?includeOutOfStock=true'));
      expect(fullList.map((p) => p._id)).to.have.members([withStock._id, noStock._id]);
    });

    it('200: los DISCONTINUED nunca se listan', async () => {
      const product = await createProduct();
      expectSuccess(await api().put(`/api/products/${product._id}`).send({ status: PRODUCT_STATUS.DISCONTINUED }));

      const list = expectSuccess(await api().get('/api/products?includeOutOfStock=true'));
      expect(list).to.be.empty;
    });

    it('400 VALIDATION_ERROR: page=0', async () => {
      expectError(await api().get('/api/products?page=0'), { status: 400, code: ERROR_CODES.VALIDATION_ERROR });
    });
  });

  describe('GET /api/products/:id', () => {
    it('200: devuelve el producto', async () => {
      const created = await createProduct({ name: 'Buscado' });
      const product = expectSuccess(await api().get(`/api/products/${created._id}`));
      expect(product).to.include({ _id: created._id, name: 'Buscado' });
    });

    it('404 PRODUCT_NOT_FOUND', async () => {
      expectError(await api().get(`/api/products/${NON_EXISTENT_ID}`), { status: 404, code: ERROR_CODES.PRODUCT_NOT_FOUND });
    });

    it('400 INVALID_ID', async () => {
      expectError(await api().get(`/api/products/${INVALID_ID}`), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });

  describe('PUT /api/products/:id', () => {
    it('200: actualiza el precio', async () => {
      const created = await createProduct({ price: 100 });
      const product = expectSuccess(await api().put(`/api/products/${created._id}`).send({ price: 150 }));
      expect(product).to.include({ _id: created._id, price: 150 });
    });

    it('200: al dejar el stock en 0 el estado pasa a OUT_OF_STOCK', async () => {
      const created = await createProduct({ stock: 10 });
      const product = expectSuccess(await api().put(`/api/products/${created._id}`).send({ stock: 0 }));
      expect(product).to.include({ stock: 0, status: PRODUCT_STATUS.OUT_OF_STOCK });
    });

    it('400 INVALID_STATUS: estado fuera de las constantes', async () => {
      const created = await createProduct();
      const body = expectError(await api().put(`/api/products/${created._id}`).send({ status: 'ROTO' }), {
        status: 400, code: ERROR_CODES.INVALID_STATUS,
      });
      expect(body.details[0].allowed).to.have.members(Object.values(PRODUCT_STATUS));
    });

    it('400 NEGATIVE_VALUE y 400 VALIDATION_ERROR', async () => {
      const created = await createProduct();
      expectError(await api().put(`/api/products/${created._id}`).send({ stock: -3 }), {
        status: 400, code: ERROR_CODES.NEGATIVE_VALUE,
      });
      expectError(await api().put(`/api/products/${created._id}`).send({ price: 'caro' }), {
        status: 400, code: ERROR_CODES.VALIDATION_ERROR,
      });
    });

    it('404 PRODUCT_NOT_FOUND y 400 INVALID_ID', async () => {
      expectError(await api().put(`/api/products/${NON_EXISTENT_ID}`).send({ price: 1 }), {
        status: 404, code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
      expectError(await api().put(`/api/products/${INVALID_ID}`).send({ price: 1 }), {
        status: 400, code: ERROR_CODES.INVALID_ID,
      });
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('204: elimina el producto (sin body)', async () => {
      const created = await createProduct();
      const res = await api().delete(`/api/products/${created._id}`);
      expect(res.status).to.equal(204);
      expect(res.text).to.equal('');
      expectError(await api().get(`/api/products/${created._id}`), { status: 404, code: ERROR_CODES.PRODUCT_NOT_FOUND });
    });

    it('404 PRODUCT_NOT_FOUND y 400 INVALID_ID', async () => {
      expectError(await api().delete(`/api/products/${NON_EXISTENT_ID}`), { status: 404, code: ERROR_CODES.PRODUCT_NOT_FOUND });
      expectError(await api().delete(`/api/products/${INVALID_ID}`), { status: 400, code: ERROR_CODES.INVALID_ID });
    });
  });
});
