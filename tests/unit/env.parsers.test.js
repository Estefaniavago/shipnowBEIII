import assert from 'node:assert/strict';
import { parseBoolean, parsePort, parsePublicUrl } from '../../src/config/env.parsers.js';

describe('env.parsers', () => {
  describe('parseBoolean', () => {
    it('usa el valor por defecto cuando la variable no está o está vacía', () => {
      assert.equal(parseBoolean('X', undefined, true), true);
      assert.equal(parseBoolean('X', '', false), false);
      assert.equal(parseBoolean('X', '   ', true), true);
    });

    it('acepta true/false sin importar mayúsculas ni espacios', () => {
      assert.equal(parseBoolean('X', 'true', false), true);
      assert.equal(parseBoolean('X', ' FALSE ', true), false);
      assert.equal(parseBoolean('X', 'True', false), true);
    });

    it('rechaza cualquier otro valor con un mensaje que nombra la variable', () => {
      for (const bad of ['1', 'si', 'yes', 'verdadero']) {
        assert.throws(() => parseBoolean('ENABLE_DOCS', bad, true), /ENABLE_DOCS debe ser "true" o "false"/);
      }
    });
  });

  describe('parsePort', () => {
    it('acepta puertos válidos', () => {
      assert.equal(parsePort('3000'), 3000);
      assert.equal(parsePort('1'), 1);
      assert.equal(parsePort('65535'), 65535);
    });

    it('rechaza puertos inválidos', () => {
      for (const bad of ['0', '-1', '65536', 'abc', '3000.5', '', undefined]) {
        assert.throws(() => parsePort(bad), /PORT debe ser un entero entre 1 y 65535/);
      }
    });
  });

  describe('parsePublicUrl', () => {
    it('devuelve null si no se define', () => {
      assert.equal(parsePublicUrl(undefined), null);
      assert.equal(parsePublicUrl(''), null);
      assert.equal(parsePublicUrl('  '), null);
    });

    it('acepta http/https y saca la barra final', () => {
      assert.equal(parsePublicUrl('https://api.shipnow.com'), 'https://api.shipnow.com');
      assert.equal(parsePublicUrl('https://api.shipnow.com/'), 'https://api.shipnow.com');
      assert.equal(parsePublicUrl(' http://localhost:3000// '), 'http://localhost:3000');
    });

    it('rechaza valores que no son una URL http(s)', () => {
      assert.throws(() => parsePublicUrl('api.shipnow.com'), /PUBLIC_URL no es una URL válida/);
      assert.throws(() => parsePublicUrl('ftp://servidor.com'), /debe empezar con http/);
    });
  });
});
