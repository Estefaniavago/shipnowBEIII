import { ProductModel } from '../models/product.model.js';
import { PRODUCT_STATUS } from '../constants/index.js';

// Proyección por defecto: ocultamos campos internos de Mongo.
const DEFAULT_PROJECTION = '-__v';

class ProductRepository {
  // Por defecto nunca devuelve productos DISCONTINUED.
  async getAll({ excludeStatuses = [], page = 1, limit = 20 } = {}) {
    const hiddenStatuses = [PRODUCT_STATUS.DISCONTINUED, ...excludeStatuses];
    return ProductModel.find({ status: { $nin: hiddenStatuses } }, DEFAULT_PROJECTION)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getById(id) {
    return ProductModel.findById(id, DEFAULT_PROJECTION).lean();
  }

  async create(data) {
    const product = await ProductModel.create(data);
    return product.toObject({ versionKey: false });
  }

  async update(id, data) {
    return ProductModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      projection: DEFAULT_PROJECTION,
    }).lean();
  }

  async delete(id) {
    return ProductModel.findByIdAndDelete(id).lean();
  }
}

export default new ProductRepository();
