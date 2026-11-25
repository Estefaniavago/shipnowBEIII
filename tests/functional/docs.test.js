import { expect } from 'chai';
import { api } from './helpers/api.js';
import { expectError } from './helpers/assertions.js';
import { ERROR_CODES } from '../../src/errors/index.js';

describe('Swagger - /api/docs', () => {
  it('200: Swagger UI se sirve como HTML', async () => {
    const res = await api().get('/api/docs/');

    expect(res.status).to.equal(200);
    expect(res.type).to.equal('text/html');
    expect(res.text).to.include('swagger-ui');
  });

  it('200: la especificación OpenAPI se sirve en JSON con la información general', async () => {
    const res = await api().get('/api/docs/openapi.json');

    expect(res.status).to.equal(200);
    expect(res.type).to.equal('application/json');
    expect(res.body).to.include.all.keys('openapi', 'info', 'servers', 'tags', 'paths', 'components');
    expect(res.body.openapi).to.equal('3.0.3');
    expect(res.body.info).to.include({ title: 'ShipNow API' });
    expect(res.body.info.version).to.be.a('string');
    expect(res.body.info.description).to.be.a('string');
    expect(res.body.servers[0].url).to.match(/^http:\/\/localhost:\d+$/);
  });

  it('200: la spec documenta los tags y los endpoints principales', async () => {
    const { body } = await api().get('/api/docs/openapi.json');

    expect(body.tags.map((t) => t.name)).to.include.members(['Health', 'Users', 'Orders', 'Deliveries', 'Mocks', 'Logger']);
    expect(Object.keys(body.paths)).to.include.members([
      '/api/health',
      '/api/users', '/api/users/{id}',
      '/api/orders', '/api/orders/{id}', '/api/orders/{id}/status',
      '/api/deliveries', '/api/deliveries/{id}',
      '/api/mocks/users', '/api/mocks/seed',
      '/api/logger/test',
    ]);
    expect(Object.keys(body.components.schemas)).to.include.members(
      ['User', 'Order', 'OrderItem', 'Delivery', 'ErrorResponse', 'SuccessResponse']
    );
  });

  it('200: los endpoints de carga se documentan como multipart/form-data con su campo de archivo', async () => {
    const { body } = await api().get('/api/docs/openapi.json');

    const userUpload = body.paths['/api/users/{id}/documents'].post;
    const receiptUpload = body.paths['/api/deliveries/{id}/receipts'].post;
    expect(userUpload.requestBody.content).to.have.all.keys('multipart/form-data');
    expect(receiptUpload.requestBody.content).to.have.all.keys('multipart/form-data');

    const { UserDocumentUpload, DeliveryReceiptUpload } = body.components.schemas;
    expect(UserDocumentUpload.required).to.deep.equal(['document']);
    expect(UserDocumentUpload.properties.document).to.include({ type: 'string', format: 'binary' });
    expect(UserDocumentUpload.properties.documentType.enum).to.have.members(['ID_CARD', 'DRIVER_LICENSE', 'PROOF_OF_ADDRESS', 'OTHER']);
    expect(DeliveryReceiptUpload.required).to.deep.equal(['receipt']);
    expect(Object.keys(userUpload.responses)).to.include.members(['201', '400', '404', '413', '415', '500']);
  });

  it('200: todas las operaciones de la spec servida tienen respuestas documentadas', async () => {
    const { body } = await api().get('/api/docs/openapi.json');
    const operations = Object.values(body.paths).flatMap((item) => Object.values(item));

    expect(operations.length).to.be.greaterThan(20);
    operations.forEach((operation) => {
      expect(operation.responses).to.be.an('object');
      expect(Object.keys(operation.responses).length).to.be.greaterThan(1);
    });
  });

  it('404 ROUTE_NOT_FOUND: la spec solo existe en la ruta documentada', async () => {
    expectError(await api().get('/api/docs.json'), {
      status: 404, code: ERROR_CODES.ROUTE_NOT_FOUND, path: '/api/docs.json',
    });
  });
});
