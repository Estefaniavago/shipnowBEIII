import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H, USER_ROLES } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, paramRef, operation, success, noContent, jsonBody, DB_ERRORS, BODY_ERRORS } from '../helpers.js';

const tag = TAGS.USERS;
const ID_PATH = '/api/users/6650a1f2c3d4e5f607182930';

export const usersPaths = {
  '/api/users': {
    get: operation({
      tag, id: 'listUsers', summary: 'Listar usuarios',
      description: 'Devuelve los usuarios paginados, del más nuevo al más antiguo. Se puede filtrar por `role`. Nunca incluye el password.',
      parameters: [paramRef('FilterRole'), paramRef('Page'), paramRef('Limit')],
      responses: success(H.OK, 'Lista de usuarios', { type: 'array', items: ref('User') }),
      errors: [E.VALIDATION_ERROR, E.INVALID_ROLE, ...DB_ERRORS], examplePath: '/api/users?page=0',
    }),
    post: operation({
      tag, id: 'createUser', summary: 'Crear usuario',
      description: 'Crea un usuario. El password se guarda hasheado y nunca se devuelve. Si no se envía `role`, se asigna `USER`.',
      requestBody: jsonBody('UserCreate', { name: 'Ana Pérez', email: 'ana.perez@test.com', password: 'secreto123', role: USER_ROLES.USER }),
      responses: success(H.CREATED, 'Usuario creado', ref('User')),
      errors: [E.MISSING_FIELDS, E.VALIDATION_ERROR, E.INVALID_ROLE, ...BODY_ERRORS, E.EMAIL_ALREADY_EXISTS, ...DB_ERRORS],
      examplePath: '/api/users',
    }),
  },
  '/api/users/{id}': {
    get: operation({
      tag, id: 'getUserById', summary: 'Obtener un usuario por id',
      description: 'Devuelve un usuario (sin password).',
      parameters: [paramRef('IdPath')],
      responses: success(H.OK, 'Usuario encontrado', ref('User')),
      errors: [E.INVALID_ID, E.USER_NOT_FOUND, ...DB_ERRORS], examplePath: ID_PATH,
    }),
    put: operation({
      tag, id: 'updateUser', summary: 'Actualizar un usuario',
      description: 'Actualiza los campos enviados. Si se envía `password`, se vuelve a hashear.',
      parameters: [paramRef('IdPath')],
      requestBody: jsonBody('UserUpdate', { name: 'Ana P. Gómez' }),
      responses: success(H.OK, 'Usuario actualizado', ref('User')),
      errors: [E.INVALID_ID, E.VALIDATION_ERROR, E.INVALID_ROLE, ...BODY_ERRORS, E.USER_NOT_FOUND, E.DUPLICATE_KEY, ...DB_ERRORS],
      examplePath: ID_PATH,
    }),
    delete: operation({
      tag, id: 'deleteUser', summary: 'Eliminar un usuario',
      description: 'Elimina el usuario. Responde `204` sin cuerpo.',
      parameters: [paramRef('IdPath')],
      responses: noContent('Usuario eliminado'),
      errors: [E.INVALID_ID, E.USER_NOT_FOUND, ...DB_ERRORS], examplePath: ID_PATH,
    }),
  },
};
