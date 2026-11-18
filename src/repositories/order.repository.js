import { OrderModel } from '../models/order.model.js';

class OrderRepository {
  async insertMany(orders) {
    const inserted = await OrderModel.insertMany(orders);
    return inserted.length;
  }

  async create(data) {
    const order = await OrderModel.create(data);
    return order.toObject({ versionKey: false });
  }

  async getAll({ page = 1, limit = 20 } = {}) {
    return OrderModel.find({}, '-__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getById(id) {
    return OrderModel.findById(id, '-__v').lean();
  }

  async updateStatus(id, status) {
    return OrderModel.findByIdAndUpdate(id, { status }, {
      new: true,
      runValidators: true,
      projection: '-__v',
    }).lean();
  }

  // Pedidos más recientes en alguno de los estados indicados (solo id y estado).
  async getByStatuses(statuses, limit = 100) {
    const orders = await OrderModel.find({ status: { $in: statuses } }, 'status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return orders.map((o) => ({ _id: String(o._id), status: o.status }));
  }

  async deleteMocks() {
    const { deletedCount } = await OrderModel.deleteMany({ isMock: true });
    return deletedCount;
  }
}

export default new OrderRepository();
