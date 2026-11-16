import mongoose from 'mongoose';
import { UserModel } from '../models/user.model.js';

// Por defecto NUNCA se devuelve el hash del password.
const PUBLIC_PROJECTION = '-password -__v';
const isValidId = (id) => mongoose.isValidObjectId(id);

class UserRepository {
  async getAll({ page = 1, limit = 20 } = {}) {
    return UserModel.find({}, PUBLIC_PROJECTION)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return UserModel.findById(id, PUBLIC_PROJECTION).lean();
  }

  // Uso interno (ej. login): incluye password de forma explícita.
  async getByEmailWithPassword(email) {
    return UserModel.findOne({ email: email.toLowerCase() }).lean();
  }

  async existsByEmail(email) {
    return UserModel.exists({ email: email.toLowerCase() });
  }

  async create(data) {
    const user = await UserModel.create(data);
    const { password, __v, ...publicUser } = user.toObject();
    return publicUser;
  }

  // Inserta varios usuarios de una vez. Devuelve la cantidad insertada.
  async insertMany(users) {
    const inserted = await UserModel.insertMany(users);
    return inserted.length;
  }

  async getIdsByRole(role, limit = 100) {
    const users = await UserModel.find({ role }, '_id').limit(limit).lean();
    return users.map((u) => String(u._id));
  }

  async deleteMocks() {
    const { deletedCount } = await UserModel.deleteMany({ isMock: true });
    return deletedCount;
  }

  async update(id, data) {
    if (!isValidId(id)) return null;
    return UserModel.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
      projection: PUBLIC_PROJECTION,
    }).lean();
  }

  async delete(id) {
    if (!isValidId(id)) return null;
    return UserModel.findByIdAndDelete(id, { projection: PUBLIC_PROJECTION }).lean();
  }
}

export default new UserRepository();
