import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProductService } from '../src/services/product.service.js';
import { PRODUCT_STATUS } from '../src/constants/index.js';

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
      const created = { _id: String(items.length + 1), ...data };
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

test('create: stock > 0 => AVAILABLE', async () => {
  const service = new ProductService(makeFakeRepo());
  const product = await service.create({ name: 'Caja', price: 100, stock: 5 });
  assert.equal(product.status, PRODUCT_STATUS.AVAILABLE);
});

test('create: stock 0 => OUT_OF_STOCK', async () => {
  const service = new ProductService(makeFakeRepo());
  const product = await service.create({ name: 'Caja', price: 100, stock: 0 });
  assert.equal(product.status, PRODUCT_STATUS.OUT_OF_STOCK);
});

test('create: precio negativo => error 400', async () => {
  const service = new ProductService(makeFakeRepo());
  await assert.rejects(() => service.create({ name: 'X', price: -1, stock: 1 }), { statusCode: 400 });
});

test('getAll: por defecto excluye OUT_OF_STOCK', async () => {
  const repo = makeFakeRepo();
  await new ProductService(repo).getAll();
  assert.deepEqual(repo.calls.getAll.excludeStatuses, [PRODUCT_STATUS.OUT_OF_STOCK]);
});

test('getAll: includeOutOfStock no excluye nada', async () => {
  const repo = makeFakeRepo();
  await new ProductService(repo).getAll({ includeOutOfStock: true });
  assert.deepEqual(repo.calls.getAll.excludeStatuses, []);
});

test('getById: inexistente => error 404', async () => {
  const service = new ProductService(makeFakeRepo());
  await assert.rejects(() => service.getById('nope'), { statusCode: 404 });
});

test('update: pasar stock a 0 cambia el estado a OUT_OF_STOCK', async () => {
  const repo = makeFakeRepo([{ _id: '1', name: 'A', price: 1, stock: 3, status: PRODUCT_STATUS.AVAILABLE }]);
  const updated = await new ProductService(repo).update('1', { stock: 0 });
  assert.equal(updated.status, PRODUCT_STATUS.OUT_OF_STOCK);
});

test('update: DISCONTINUED se mantiene aunque haya stock', async () => {
  const repo = makeFakeRepo([{ _id: '1', name: 'A', price: 1, stock: 0, status: PRODUCT_STATUS.DISCONTINUED }]);
  const updated = await new ProductService(repo).update('1', { stock: 10 });
  assert.equal(updated.status, PRODUCT_STATUS.DISCONTINUED);
});
