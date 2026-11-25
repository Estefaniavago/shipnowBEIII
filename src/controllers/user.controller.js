import { userService, documentService } from '../services/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

const ok = (res, statusCode, payload) =>
  res.status(statusCode).json({ status: RESPONSE_STATUS.SUCCESS, payload });

export const getAll = asyncHandler(async (req, res) => {
  const { page, limit, role } = req.query;
  ok(res, HTTP_STATUS.OK, await userService.getAll({ page, limit, role }));
});

export const getById = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.OK, await userService.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.CREATED, await userService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.OK, await userService.update(req.params.id, req.body));
});

export const remove = asyncHandler(async (req, res) => {
  await userService.delete(req.params.id);
  res.status(HTTP_STATUS.NO_CONTENT).send();
});

export const uploadDocument = asyncHandler(async (req, res) => {
  const user = await documentService.uploadUserDocument({
    userId: req.params.id,
    file: req.file,
    documentType: req.body?.documentType,
  });
  ok(res, HTTP_STATUS.CREATED, user);
});
