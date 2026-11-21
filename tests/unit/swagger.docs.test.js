import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildOpenApiSpec } from '../../src/docs/openapi/index.js';
import { errorResponses } from '../../src/docs/openapi/helpers.js';
import { ERROR_DICTIONARY, ERROR_CODES } from '../../src/errors/index.js';
import {
  USER_ROLES, PRODUCT_STATUS, ORDER_STATUS, ORDER_PRIORITY, DELIVERY_STATUS, MOCK_TYPES, MOCK,
} from '../../src/constants/index.js';

describe('swagger.docs', () => {
  const spec = buildOpenApiSpec({ port: 3000 });
  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
  const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
    HTTP_METHODS.filter((m) => item[m]).map((method) => ({ path, method, op: item[method] }))
  );
  const resolveParam = (p) => (p.$ref ? spec.components.parameters[p.$ref.split('/').pop()] : p);

  // ---------- Información general ----------
  it('info: nombre, versión, descripción y servidor local', () => {
    assert.equal(spec.openapi, '3.0.3');
    assert.equal(spec.info.title, 'ShipNow API');
    const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    assert.equal(spec.info.version, version);
    assert.ok(spec.info.description.length > 100);
    assert.deepEqual(spec.servers, [{ url: 'http://localhost:3000', description: 'Servidor local' }]);
  });

  it('tags: están Users, Orders, Deliveries, Mocks y Logger, y todas las operaciones usan tags declarados', () => {
    const names = spec.tags.map((t) => t.name);
    for (const required of ['Users', 'Orders', 'Deliveries', 'Mocks', 'Logger']) assert.ok(names.includes(required), required);
    for (const { path, method, op } of operations) {
      assert.ok(op.tags?.length === 1 && names.includes(op.tags[0]), `${method} ${path}`);
    }
    for (const t of spec.tags) assert.ok(operations.some((o) => o.op.tags[0] === t.name), `tag sin endpoints: ${t.name}`);
  });

  // ---------- Estructura de cada endpoint ----------
  it('operaciones: summary, description, operationId único, una respuesta exitosa y al menos un error', () => {
    const ids = new Set();
    for (const { path, method, op } of operations) {
      const label = `${method.toUpperCase()} ${path}`;
      assert.ok(op.summary && op.description, `${label}: falta summary/description`);
      assert.ok(op.operationId && !ids.has(op.operationId), `${label}: operationId faltante o repetido`);
      ids.add(op.operationId);
      const statuses = Object.keys(op.responses).map(Number);
      assert.ok(statuses.some((s) => s >= 200 && s < 300), `${label}: sin respuesta exitosa`);
      assert.ok(statuses.some((s) => s >= 400), `${label}: sin errores documentados`);
    }
  });

  it('operaciones: todo parámetro de ruta {x} está declarado', () => {
    for (const { path, method, op } of operations) {
      for (const [, name] of path.matchAll(/\{(\w+)\}/g)) {
        const declared = (op.parameters ?? []).map(resolveParam).some((p) => p.in === 'path' && p.name === name && p.required);
        assert.ok(declared, `${method.toUpperCase()} ${path}: falta el parámetro de ruta ${name}`);
      }
    }
  });

  it('operaciones: POST/PUT/PATCH con body lo documentan (salvo seed, que usa query)', () => {
    for (const { path, method, op } of operations) {
      if (!['post', 'put', 'patch'].includes(method) || path === '/api/mocks/seed') continue;
      assert.ok(op.requestBody?.content?.['application/json'] || op.requestBody?.content?.['multipart/form-data'], `${method.toUpperCase()} ${path}: falta requestBody`);
    }
    assert.equal(spec.paths['/api/mocks/seed'].post.requestBody, undefined);
  });

  // ---------- $ref ----------
  it('todos los $ref apuntan a algo que existe', () => {
    const refs = [];
    (function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) (key === '$ref' ? refs.push(value) : walk(value));
      }
    })(spec);
    assert.ok(refs.length > 50);
    for (const r of refs) {
      const target = r.replace('#/', '').split('/').reduce((acc, k) => acc?.[k], spec);
      assert.ok(target, `$ref roto: ${r}`);
    }
  });

  // ---------- Schemas ----------
  it('schemas reutilizables pedidos por la consigna', () => {
    for (const name of ['User', 'Order', 'Delivery', 'OrderItem', 'ErrorResponse', 'SuccessResponse']) {
      assert.ok(spec.components.schemas[name], name);
    }
  });

  it('enums de los schemas coinciden con las constantes del proyecto', () => {
    const { schemas } = spec.components;
    assert.deepEqual(schemas.User.properties.role.enum, Object.values(USER_ROLES));
    assert.deepEqual(schemas.Product.properties.status.enum, Object.values(PRODUCT_STATUS));
    assert.deepEqual(schemas.Order.properties.status.enum, Object.values(ORDER_STATUS));
    assert.deepEqual(schemas.Order.properties.priority.enum, Object.values(ORDER_PRIORITY));
    assert.deepEqual(schemas.Delivery.properties.status.enum, Object.values(DELIVERY_STATUS));
    assert.deepEqual(spec.components.parameters.MockSeedType.schema.enum, Object.values(MOCK_TYPES));
    assert.deepEqual(schemas.ErrorResponse.properties.code.enum, Object.keys(ERROR_DICTIONARY));
  });

  it('ErrorResponse documenta exactamente los campos que devuelve el middleware', () => {
    assert.deepEqual(
      Object.keys(spec.components.schemas.ErrorResponse.properties),
      ['status', 'code', 'message', 'details', 'path', 'timestamp']
    );
  });

  // ---------- Errores ----------
  it('errores: cada respuesta de error usa el status real del diccionario', () => {
    for (const { path, method, op } of operations) {
      for (const [status, response] of Object.entries(op.responses)) {
        if (Number(status) < 400) continue;
        const examples = response.content['application/json'].examples;
        assert.ok(Object.keys(examples).length > 0);
        for (const [code, example] of Object.entries(examples)) {
          assert.ok(ERROR_DICTIONARY[code], `${method} ${path}: código inexistente ${code}`);
          assert.equal(ERROR_DICTIONARY[code].status, Number(status), `${method} ${path}: ${code} no es ${status}`);
          assert.equal(example.value.message, ERROR_DICTIONARY[code].message);
        }
      }
    }
  });

  it('errores: un código que no existe en el diccionario rompe el armado de la doc', () => {
    assert.throws(() => errorResponses(['NO_EXISTE']));
  });

  it('errores: cobertura pedida (datos inválidos, no encontrado, interno, qty mocks, estado inválido)', () => {
    const codesOf = (path, method) =>
      Object.values(spec.paths[path][method].responses).flatMap((r) => Object.keys(r.content?.['application/json']?.examples ?? {}));
    assert.ok(codesOf('/api/orders', 'post').includes(ERROR_CODES.VALIDATION_ERROR));
    assert.ok(codesOf('/api/orders/{id}', 'get').includes(ERROR_CODES.ORDER_NOT_FOUND));
    assert.ok(codesOf('/api/users/{id}', 'get').includes(ERROR_CODES.INTERNAL_ERROR));
    assert.ok(codesOf('/api/orders/{id}/status', 'patch').includes(ERROR_CODES.INVALID_STATUS));
    assert.ok(codesOf('/api/deliveries/{id}', 'patch').includes(ERROR_CODES.INVALID_STATUS));
    for (const code of [ERROR_CODES.MOCK_QTY_INVALID, ERROR_CODES.MOCK_QTY_NEGATIVE, ERROR_CODES.MOCK_QTY_OUT_OF_RANGE]) {
      assert.ok(codesOf('/api/mocks/users', 'get').includes(code), code);
      assert.ok(codesOf('/api/mocks/seed', 'post').includes(code), code);
    }
    assert.ok(codesOf('/api/mocks/seed', 'post').includes(ERROR_CODES.MOCK_SEED_FAILED));
  });

  it('no se documenta autenticación (la API no la tiene)', () => {
    assert.equal(spec.components.securitySchemes, undefined);
    for (const { op } of operations) {
      assert.ok(!('401' in op.responses) && !('403' in op.responses));
    }
  });

  // ---------- Mocks y logger ----------
  it('mocks: seed documenta qty y type por query y los GET documentan qty', () => {
    const seedParams = spec.paths['/api/mocks/seed'].post.parameters.map(resolveParam).map((p) => p.name);
    assert.deepEqual(seedParams, ['qty', 'type']);
    for (const p of ['users', 'couriers', 'orders', 'deliveries', 'dataset']) {
      assert.deepEqual(spec.paths[`/api/mocks/${p}`].get.parameters.map(resolveParam).map((x) => x.name), ['qty']);
    }
    assert.ok(resolveParam(spec.components.parameters.MockQty).description.includes(String(MOCK.MAX_QTY)));
  });

  it('logger: se aclara que es una herramienta de validación y no de negocio', () => {
    const { description } = spec.paths['/api/logger/test'].get;
    assert.match(description, /no es una funcionalidad de negocio/);
  });

  // ---------- La doc refleja la API real ----------
  it('paridad: las rutas documentadas son exactamente las que existen en src/routes', () => {
    const read = (file) => readFileSync(new URL(`../../src/routes/${file}`, import.meta.url), 'utf8');
    const index = read('index.js');
    const fileByVar = Object.fromEntries([...index.matchAll(/import (\w+) from '\.\/([\w.-]+)'/g)].map((m) => [m[1], m[2]]));

    const real = new Set();
    for (const [, prefix, variable] of index.matchAll(/router\.use\('([^']+)',\s*(\w+)\)/g)) {
      for (const [, method, sub] of read(fileByVar[variable]).matchAll(/router\.(get|post|put|patch|delete)\('([^']*)'/g)) {
        const fullPath = `/api${prefix}${sub === '/' ? '' : sub}`.replace(/:(\w+)/g, '{$1}');
        real.add(`${method.toUpperCase()} ${fullPath}`);
      }
    }
    const documented = new Set(operations.map(({ method, path }) => `${method.toUpperCase()} ${path}`));

    assert.ok(real.size >= 20);
    assert.deepEqual([...documented].sort(), [...real].sort());
  });
});
