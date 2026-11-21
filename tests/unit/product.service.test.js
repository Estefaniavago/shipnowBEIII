import assert from 'node:assert/strict';
import { ProductService } from '../../src/services/product.service.js';
import { PRODUCT_STATUS } from '../../src/constants/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('product.service', () => {
  const ID1 = 'a'.repeat(24);
  const MISSING_ID = 'b'.repeat(24);

  // Repository falso en memoria: el Service se prueba sin base de datos.
  function makeFakeRepo(initial = []) {
    const items = [...initial];
    return {
      calls: {},
      async getAll(options) {
        this.calls.getAll = options;
        return items;
      },
      async getById(id) {
        return items.find((p) => p._id === id) ?? null;
      },
      async create(data) {
        const created = { _id: String(items.length + 1).padStart(24, '0'), ...data };
        items.push(created);
        return created;
      },
      async update(id, data) {
        const p = items.find((x) => x._id === id);
        return p ? Object.assign(p, data) : null;
      },
      async delete(id) {
        return items.find((p) => p._id === id) ?? null;
      },
    };
  }

  it('create: stock > 0 => AVAILABLE', async () => {
    const service = new ProductService(makeFakeRepo());
    const product = await service.create({ name: 'Caja', price: 100, stock: 5 });
    assert.equal(product.status, PRODUCT_STATUS.AVAILABLE);
  });

  it('create: stock 0 => OUT_OF_STOCK', async () => {
    const service = new ProductService(makeFakeRepo());
    const product = await service.create({ name: 'Caja', price: 100, stock: 0 });
    assert.equal(product.status, PRODUCT_STATUS.OUT_OF_STOCK);
  });

  it('create: precio negativo => error 400', async () => {
    const service = new ProductService(makeFakeRepo());
    await assert.rejects(() => service.create({ name: 'X', price: -1, stock: 1 }), { code: ERROR_CODES.NEGATIVE_VALUE, statusCode: 400 });
  });

  it('getAll: por defecto excluye OUT_OF_STOCK', async () => {
    const repo = makeFakeRepo();
    await new ProductService(repo).getAll();
    assert.deepEqual(repo.calls.getAll.excludeStatuses, [PRODUCT_STATUS.OUT_OF_STOCK]);
  });

  it('getAll: includeOutOfStock no excluye nada', async () => {
    const repo = makeFakeRepo();
    await new ProductService(repo).getAll({ includeOutOfStock: true });
    assert.deepEqual(repo.calls.getAll.excludeStatuses, []);
  });

  it('getById: inexistente => PRODUCT_NOT_FOUND 404', async () => {
    const service = new ProductService(makeFakeRepo());
    await assert.rejects(() => service.getById(MISSING_ID), { code: ERROR_CODES.PRODUCT_NOT_FOUND, statusCode: 404 });
  });

  it('getById: id con formato inválido => INVALID_ID 400', async () => {
    const service = new ProductService(makeFakeRepo());
    await assert.rejects(() => service.getById('nope'), { code: ERROR_CODES.INVALID_ID, statusCode: 400 });
  });

  it('create: faltan campos => MISSING_FIELDS con detalle', async () => {
    const service = new ProductService(makeFakeRepo());
    await assert.rejects(
      () => service.create({ stock: 1 }),
      (err) => err.code === ERROR_CODES.MISSING_FIELDS && err.details.length === 2
    );
  });

  it('create: price no numérico => VALIDATION_ERROR', async () => {
    const service = new ProductService(makeFakeRepo());
    await assert.rejects(() => service.create({ name: 'X', price: 'abc' }), { code: ERROR_CODES.VALIDATION_ERROR });
  });

  it('update: status inválido => INVALID_STATUS', async () => {
    const repo = makeFakeRepo([{ _id: ID1, name: 'A', price: 1, stock: 3, status: PRODUCT_STATUS.AVAILABLE }]);
    await assert.rejects(() => new ProductService(repo).update(ID1, { status: 'ROTO' }), { code: ERROR_CODES.INVALID_STATUS });
  });

  it('update: stock negativo => NEGATIVE_VALUE', async () => {
    const repo = makeFakeRepo([{ _id: ID1, name: 'A', price: 1, stock: 3, status: PRODUCT_STATUS.AVAILABLE }]);
    await assert.rejects(() => new ProductService(repo).update(ID1, { stock: -5 }), { code: ERROR_CODES.NEGATIVE_VALUE });
  });

  it('getAll: page inválida => VALIDATION_ERROR', async () => {
    await assert.rejects(() => new ProductService(makeFakeRepo()).getAll({ page: '0' }), { code: ERROR_CODES.VALIDATION_ERROR });
    await assert.rejects(() => new ProductService(makeFakeRepo()).getAll({ limit: '1000' }), { code: ERROR_CODES.VALIDATION_ERROR });
  });

  it('update: pasar stock a 0 cambia el estado a OUT_OF_STOCK', async () => {
    const repo = makeFakeRepo([{ _id: ID1, name: 'A', price: 1, stock: 3, status: PRODUCT_STATUS.AVAILABLE }]);
    const updated = await new ProductService(repo).update(ID1, { stock: 0 });
    assert.equal(updated.status, PRODUCT_STATUS.OUT_OF_STOCK);
  });

  it('update: DISCONTINUED se mantiene aunque haya stock', async () => {
    const repo = makeFakeRepo([{ _id: ID1, name: 'A', price: 1, stock: 0, status: PRODUCT_STATUS.DISCONTINUED }]);
    const updated = await new ProductService(repo).update(ID1, { stock: 10 });
    assert.equal(updated.status, PRODUCT_STATUS.DISCONTINUED);
  });

  it('logging: crear y actualizar un producto registra eventos info', async () => {
    const calls = [];
    const logger = { info: (msg) => calls.push(msg) };
    const repo = makeFakeRepo();
    const service = new ProductService(repo, logger);
    const created = await service.create({ name: 'Caja', price: 10, stock: 2 });
    await service.update(created._id, { stock: 0 });
    assert.equal(calls.length, 2);
    assert.match(calls[0], /^Producto creado: /);
    assert.match(calls[1], /^Producto actualizado: .*OUT_OF_STOCK/);
  });
});
