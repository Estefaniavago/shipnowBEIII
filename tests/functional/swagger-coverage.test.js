import { expect } from 'chai';
import { readdirSync, readFileSync } from 'node:fs';
import { buildOpenApiSpec } from '../../src/docs/openapi/index.js';

// Coherencia con Swagger: todo comportamiento de error que la documentación promete
// debe tener su test. Si agregás un error nuevo a la spec y no lo testeás, este test falla.

const spec = buildOpenApiSpec({ port: 3000 });
const dir = new URL('./', import.meta.url);

const read = (url) => readFileSync(url, 'utf8');
const functionalSources = readdirSync(dir)
  .filter((file) => file.endsWith('.test.js') && file !== 'swagger-coverage.test.js')
  .map((file) => read(new URL(file, dir)))
  .join('\n');
const unitSources = read(new URL('../unit/mock.service.test.js', import.meta.url));

// Errores que no se pueden provocar desde una petición HTTP sin romper la base de datos.
// Se cubren a nivel unitario (con un repositorio falso que falla).
const COVERED_BY_UNIT_TESTS = { MOCK_SEED_FAILED: unitSources };

const operations = Object.entries(spec.paths).flatMap(([path, item]) =>
  Object.entries(item).map(([method, operation]) => ({ path, method, operation }))
);

const documentedErrorCodes = new Set(
  operations.flatMap(({ operation }) =>
    Object.entries(operation.responses)
      .filter(([status]) => Number(status) >= 400)
      .flatMap(([, response]) => Object.keys(response.content['application/json'].examples))
  )
);

describe('Coherencia Swagger <-> tests funcionales', () => {
  it('la spec documenta errores (sanity check)', () => {
    expect(documentedErrorCodes.size).to.be.greaterThan(20);
  });

  [...documentedErrorCodes].sort().forEach((code) => {
    it(`el error documentado ${code} tiene un test que lo comprueba`, () => {
      const sources = COVERED_BY_UNIT_TESTS[code] ?? functionalSources;
      expect(sources, `no hay ningún test para ${code}`).to.match(new RegExp(`\\b${code}\\b`));
    });
  });

  operations.forEach(({ path, method, operation }) => {
    it(`el endpoint ${method.toUpperCase()} ${path} (${operation.tags[0]}) se invoca en algún test`, () => {
      const base = path.split('{')[0].replace(/\/$/, '');
      const tail = path.includes('}') ? path.split('}').pop() : '';
      expect(functionalSources).to.include(base);
      if (tail) expect(functionalSources).to.include(tail);
      expect(functionalSources).to.include(`.${method}(`);
    });
  });
});
