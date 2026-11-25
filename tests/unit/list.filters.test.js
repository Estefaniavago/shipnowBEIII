import assert from 'node:assert/strict';
import { OrderService } from '../../src/services/order.service.js';
import { DeliveryService } from '../../src/services/delivery.service.js';
import { parsePagination } from '../../src/utils/validators.js';
import { ERROR_CODES } from '../../src/errors/index.js';
import { ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS, PAGINATION } from '../../src/constants/index.js';

const ID = 'a'.repeat(24);

describe('listados: paginación y filtros', () => {
  describe('parsePagination', () => {
    it('acepta page y limit válidos y no inventa valores (los defaults los aplica el repository)', () => {
      assert.deepEqual(parsePagination({}), {});
      assert.deepEqual(parsePagination({ page: '2', limit: '50' }), { page: 2, limit: 50 });
      assert.deepEqual(parsePagination({ limit: String(PAGINATION.MAX_LIMIT) }), { limit: PAGINATION.MAX_LIMIT });
    });

    it('rechaza limit mayor al máximo, page/limit en 0, negativos o no numéricos', () => {
      for (const query of [
        { limit: String(PAGINATION.MAX_LIMIT + 1) }, { limit: '0' }, { page: '0' }, { page: '-1' }, { page: 'x' }, { limit: '1.5' },
      ]) {
        assert.throws(() => parsePagination(query), { code: ERROR_CODES.VALIDATION_ERROR, statusCode: 400 });
      }
    });
  });

  describe('OrderService.getAll', () => {
    const setup = () => {
      const calls = [];
      const repo = { async getAll(args) { calls.push(args); return []; } };
      return { service: new OrderService(repo, {}), calls };
    };

    it('sin filtros: filters vacío y paginación', async () => {
      const { service, calls } = setup();
      await service.getAll({ page: '2', limit: '5' });
      assert.deepEqual(calls[0], { filters: {}, page: 2, limit: 5 });
    });

    it('pasa los filtros status, priority y customer al repository', async () => {
      const { service, calls } = setup();
      await service.getAll({ status: ORDER_STATUS.CONFIRMED, priority: ORDER_PRIORITY.HIGH, customer: ID });
      assert.deepEqual(calls[0].filters, { status: 'CONFIRMED', priority: 'HIGH', customer: ID });
    });

    it('filtros inválidos => INVALID_STATUS / INVALID_PRIORITY / INVALID_ID y no consulta la base', async () => {
      const { service, calls } = setup();
      await assert.rejects(() => service.getAll({ status: 'VOLANDO' }), { code: ERROR_CODES.INVALID_STATUS });
      await assert.rejects(() => service.getAll({ priority: 'YA' }), { code: ERROR_CODES.INVALID_PRIORITY });
      await assert.rejects(() => service.getAll({ customer: '123' }), { code: ERROR_CODES.INVALID_ID });
      await assert.rejects(() => service.getAll({ limit: '1000' }), { code: ERROR_CODES.VALIDATION_ERROR });
      assert.equal(calls.length, 0);
    });
  });

  describe('DeliveryService.getAll', () => {
    const setup = () => {
      const calls = [];
      const repo = { async getAll(args) { calls.push(args); return []; } };
      return { service: new DeliveryService(repo, {}, {}), calls };
    };

    it('pasa los filtros status y courier al repository', async () => {
      const { service, calls } = setup();
      await service.getAll({ status: DELIVERY_STATUS.IN_TRANSIT, courier: ID, limit: '10' });
      assert.deepEqual(calls[0], { filters: { status: 'IN_TRANSIT', courier: ID }, limit: 10 });
    });

    it('filtros inválidos => INVALID_STATUS / INVALID_ID', async () => {
      const { service, calls } = setup();
      await assert.rejects(() => service.getAll({ status: 'ROTO' }), { code: ERROR_CODES.INVALID_STATUS });
      await assert.rejects(() => service.getAll({ courier: 'xyz' }), { code: ERROR_CODES.INVALID_ID });
      assert.equal(calls.length, 0);
    });
  });
});
