import { orderService } from '../services/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

export const getAll = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const orders = await orderService.getAll({ page, limit });
  res.status(HTTP_STATUS.OK).json({ status: RESPONSE_STATUS.SUCCESS, payload: orders });
});

export const getById = asyncHandler(async (req, res) => {
  const order = await orderService.getById(req.params.id);
  res.status(HTTP_STATUS.OK).json({ status: RESPONSE_STATUS.SUCCESS, payload: order });
});
