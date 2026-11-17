import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../constants/index.js';
import {
  UserNotFoundError,
  MissingFieldsError,
  InvalidRoleError,
  EmailAlreadyExistsError,
  RequestValidationError,
} from '../errors/index.js';
import { noopLogger } from '../utils/noop.logger.js';
import { assertValidId, findMissingFields, parsePagination } from '../utils/validators.js';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;
const validRoles = Object.values(USER_ROLES);

function assertValidRole(role) {
  if (role !== undefined && !validRoles.includes(role)) throw new InvalidRoleError(role, validRoles);
}

function assertValidPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new RequestValidationError([
      { field: 'password', message: `debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres` },
    ]);
  }
}

export class UserService {
  constructor(userRepository, logger = noopLogger) {
    this.userRepository = userRepository;
    this.logger = logger;
  }

  async getAll({ page, limit } = {}) {
    return this.userRepository.getAll(parsePagination({ page, limit }));
  }

  async getById(id) {
    assertValidId(id);
    const user = await this.userRepository.getById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }

  async create(data = {}) {
    const missing = findMissingFields(data, ['name', 'email', 'password']);
    if (missing.length) throw new MissingFieldsError(missing);
    const { name, email, password, role } = data;

    assertValidPassword(password);
    assertValidRole(role);
    if (await this.userRepository.existsByEmail(email)) throw new EmailAlreadyExistsError(email);

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userRepository.create({ name, email, password: hashed, role: role ?? USER_ROLES.USER });
    this.logger.info(`Usuario creado: ${user._id} (rol ${user.role})`);
    return user;
  }

  async update(id, data = {}) {
    await this.getById(id);
    const changes = { ...data };
    assertValidRole(changes.role);
    if (changes.password !== undefined) {
      assertValidPassword(changes.password);
      changes.password = await bcrypt.hash(changes.password, SALT_ROUNDS);
    }
    const updated = await this.userRepository.update(id, changes);
    this.logger.info(`Usuario actualizado: ${id}`);
    return updated;
  }

  async delete(id) {
    await this.getById(id);
    const deleted = await this.userRepository.delete(id);
    this.logger.info(`Usuario eliminado: ${id}`);
    return deleted;
  }
}
