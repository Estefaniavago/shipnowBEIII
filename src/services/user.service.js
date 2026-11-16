import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../constants/index.js';
import { AppError } from '../utils/AppError.js';

const SALT_ROUNDS = 10;
const validRoles = Object.values(USER_ROLES);

export class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getAll({ page, limit } = {}) {
    return this.userRepository.getAll({ page, limit });
  }

  async getById(id) {
    const user = await this.userRepository.getById(id);
    if (!user) throw new AppError('Usuario no encontrado', 404);
    return user;
  }

  async create({ name, email, password, role }) {
    if (!name || !email || !password) throw new AppError('name, email y password son obligatorios', 400);
    if (password.length < 6) throw new AppError('El password debe tener al menos 6 caracteres', 400);
    if (role && !validRoles.includes(role)) {
      throw new AppError(`Rol inválido. Permitidos: ${validRoles.join(', ')}`, 400);
    }
    if (await this.userRepository.existsByEmail(email)) throw new AppError('El email ya está registrado', 409);

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    return this.userRepository.create({ name, email, password: hashed, role: role ?? USER_ROLES.USER });
  }

  async update(id, data) {
    await this.getById(id);
    const changes = { ...data };
    if (changes.role && !validRoles.includes(changes.role)) {
      throw new AppError(`Rol inválido. Permitidos: ${validRoles.join(', ')}`, 400);
    }
    if (changes.password) changes.password = await bcrypt.hash(changes.password, SALT_ROUNDS);
    return this.userRepository.update(id, changes);
  }

  async delete(id) {
    await this.getById(id);
    return this.userRepository.delete(id);
  }
}
