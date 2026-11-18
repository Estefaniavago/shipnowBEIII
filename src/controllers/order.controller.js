import { orderService } from '../services/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

const ok = (res, statusCode, payload) =>
  res.status(statusCode).json({ status: RESPONSE_STATUS.SUCCESS, payload });

export const getAll = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  ok(res, HTTP_STATUS.OK, await orderService.getAll({ page, limit }));
});

export const getById = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.OK, await orderService.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.CREATED, await orderService.create(req.body));
});

export const updateStatus = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.OK, await orderService.updateStatus(req.params.id, req.body?.status));
});
