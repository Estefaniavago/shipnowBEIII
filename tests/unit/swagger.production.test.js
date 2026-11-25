import assert from 'node:assert/strict';
import { buildOpenApiSpec } from '../../src/docs/openapi/index.js';
import { ERROR_CODES } from '../../src/errors/index.js';
import { PAGINATION, ORDER_STATUS, USER_ROLES } from '../../src/constants/index.js';

const operationsOf = (spec) => Object.entries(spec.paths).flatMap(([path, item]) => Object.keys(item).map((m) => `${m.toUpperCase()} ${path}`));

describe('swagger: producción y performance', () => {
  it('con endpoints internos apagados no documenta mocks ni logger test (ni sus tags)', () => {
    const spec = buildOpenApiSpec({ includeInternal: false });
    const ops = operationsOf(spec);
    assert.ok(ops.every((op) => !op.includes('/api/mocks') && !op.includes('/api/logger')));
    const names = spec.tags.map((t) => t.name);
    assert.ok(!names.includes('Mocks') && !names.includes('Logger'));
    assert.ok(['Health', 'Users', 'Products', 'Orders', 'Deliveries'].every((t) => names.includes(t)));
    // lo de negocio sigue documentado
    assert.ok(ops.includes('POST /api/users/{id}/documents') && ops.includes('GET /api/health'));
  });

  it('con endpoints internos encendidos (por defecto) los documenta', () => {
    const spec = buildOpenApiSpec();
    const ops = operationsOf(spec);
    assert.ok(ops.includes('POST /api/mocks/seed') && ops.includes('GET /api/logger/test'));
    assert.ok(spec.tags.map((t) => t.name).includes('Mocks'));
  });

  it('PUBLIC_URL se agrega como servidor, antes del local', () => {
    const spec = buildOpenApiSpec({ port: 4000, publicUrl: 'https://api.shipnow.com' });
    assert.deepEqual(spec.servers.map((s) => s.url), ['https://api.shipnow.com', 'http://localhost:4000']);
  });

  it('health check documentado: público, con el schema y el 503 del diccionario', () => {
    const spec = buildOpenApiSpec();
    const op = spec.paths['/api/health'].get;
    assert.equal(op.tags[0], 'Health');
    assert.deepEqual(Object.keys(op.responses).sort(), ['200', '503']);
    assert.deepEqual(Object.keys(op.responses['503'].content['application/json'].examples), [ERROR_CODES.DATABASE_ERROR]);
    assert.deepEqual(
      Object.keys(spec.components.schemas.HealthCheck.properties).sort(),
      ['database', 'environment', 'service', 'status', 'timestamp', 'uptime']
    );
  });

  it('page y limit documentan los valores reales de paginación', () => {
    const { Limit, Page } = buildOpenApiSpec().components.parameters;
    assert.ok(Limit.description.includes(`entre 1 y ${PAGINATION.MAX_LIMIT}`));
    assert.ok(Limit.description.includes(`Por defecto ${PAGINATION.DEFAULT_LIMIT}`));
    assert.ok(Page.description.includes(`Por defecto ${PAGINATION.DEFAULT_PAGE}`));
  });

  it('los listados documentan sus filtros y sus errores', () => {
    const spec = buildOpenApiSpec();
    const paramNames = (path) =>
      spec.paths[path].get.parameters.map((p) => spec.components.parameters[p.$ref.split('/').pop()].name);
    assert.deepEqual(paramNames('/api/users'), ['role', 'page', 'limit']);
    assert.deepEqual(paramNames('/api/orders'), ['status', 'priority', 'customer', 'page', 'limit']);
    assert.deepEqual(paramNames('/api/deliveries'), ['status', 'courier', 'page', 'limit']);

    const codes = (path) =>
      Object.values(spec.paths[path].get.responses).flatMap((r) => Object.keys(r.content?.['application/json']?.examples ?? {}));
    assert.ok(codes('/api/users').includes(ERROR_CODES.INVALID_ROLE));
    assert.ok(codes('/api/orders').includes(ERROR_CODES.INVALID_STATUS));
    assert.ok(codes('/api/orders').includes(ERROR_CODES.INVALID_PRIORITY));
    assert.ok(codes('/api/deliveries').includes(ERROR_CODES.INVALID_ID));

    const { parameters } = spec.components;
    assert.deepEqual(parameters.FilterOrderStatus.schema.enum, Object.values(ORDER_STATUS));
    assert.deepEqual(parameters.FilterRole.schema.enum, Object.values(USER_ROLES));
  });
});
