import { PRODUCT_STATUS } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

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
    const excludeStatuses = includeOutOfStock ? [] : [PRODUCT_STATUS.OUT_OF_STOCK];
    return this.productRepository.getAll({ excludeStatuses, page, limit });
  }

  async getById(id) {
    const product = await this.productRepository.getById(id);
    if (!product) throw new AppError('Producto no encontrado', 404);
    return product;
  }

  async create(data) {
    const { name, price } = data;
    const stock = Number(data.stock ?? 0);
    if (!name || price === undefined) throw new AppError('name y price son obligatorios', 400);
    if (Number(price) < 0 || stock < 0) throw new AppError('price y stock no pueden ser negativos', 400);

    return this.productRepository.create({
      ...data,
      stock,
      status: resolveStatus(stock, undefined),
    });
  }

  async update(id, data) {
    const current = await this.getById(id);
    const stock = data.stock !== undefined ? Number(data.stock) : current.stock;
    if (stock < 0 || (data.price !== undefined && Number(data.price) < 0)) {
      throw new AppError('price y stock no pueden ser negativos', 400);
    }
    const status = data.status ?? resolveStatus(stock, current.status);
    return this.productRepository.update(id, { ...data, stock, status });
  }

  async delete(id) {
    await this.getById(id);
    return this.productRepository.delete(id);
  }
}
