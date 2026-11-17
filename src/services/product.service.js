import { PRODUCT_STATUS } from '../constants/index.js';
import {
  ProductNotFoundError,
  MissingFieldsError,
  InvalidStatusError,
} from '../errors/index.js';
import {
  assertValidId,
  assertNonNegative,
  findMissingFields,
  parsePagination,
  toNumber,
} from '../utils/validators.js';

// Regla de negocio: el estado depende del stock (salvo que esté discontinuado).
function resolveStatus(stock, currentStatus) {
  if (currentStatus === PRODUCT_STATUS.DISCONTINUED) return currentStatus;
  return stock > 0 ? PRODUCT_STATUS.AVAILABLE : PRODUCT_STATUS.OUT_OF_STOCK;
}

export class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async getAll({ includeOutOfStock = false, page, limit } = {}) {
    const pagination = parsePagination({ page, limit });
    const excludeStatuses = includeOutOfStock ? [] : [PRODUCT_STATUS.OUT_OF_STOCK];
    return this.productRepository.getAll({ excludeStatuses, ...pagination });
  }

  async getById(id) {
    assertValidId(id);
    const product = await this.productRepository.getById(id);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  }

  async create(data = {}) {
    const missing = findMissingFields(data, ['name', 'price']);
    if (missing.length) throw new MissingFieldsError(missing);

    const price = toNumber('price', data.price);
    const stock = data.stock === undefined ? 0 : toNumber('stock', data.stock);
    assertNonNegative('price', price);
    assertNonNegative('stock', stock);

    return this.productRepository.create({
      ...data,
      price,
      stock,
      status: resolveStatus(stock, undefined),
    });
  }

  async update(id, data = {}) {
    const current = await this.getById(id);
    const changes = { ...data };

    if (data.price !== undefined) {
      changes.price = toNumber('price', data.price);
      assertNonNegative('price', changes.price);
    }
    if (data.stock !== undefined) {
      changes.stock = toNumber('stock', data.stock);
      assertNonNegative('stock', changes.stock);
    }
    const validStatuses = Object.values(PRODUCT_STATUS);
    if (data.status !== undefined && !validStatuses.includes(data.status)) {
      throw new InvalidStatusError(data.status, validStatuses);
    }

    const stock = changes.stock ?? current.stock;
    const status = changes.status ?? resolveStatus(stock, current.status);
    return this.productRepository.update(id, { ...changes, stock, status });
  }

  async delete(id) {
    await this.getById(id);
    return this.productRepository.delete(id);
  }
}
