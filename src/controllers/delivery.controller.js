import { deliveryService, documentService } from '../services/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

const ok = (res, statusCode, payload) =>
  res.status(statusCode).json({ status: RESPONSE_STATUS.SUCCESS, payload });

export const getAll = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  ok(res, HTTP_STATUS.OK, await deliveryService.getAll({ page, limit }));
});

export const getById = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.OK, await deliveryService.getById(req.params.id));
});

export const create = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.CREATED, await deliveryService.create(req.body));
});

export const update = asyncHandler(async (req, res) => {
  ok(res, HTTP_STATUS.OK, await deliveryService.update(req.params.id, req.body));
});

export const uploadReceipt = asyncHandler(async (req, res) => {
  const delivery = await documentService.uploadDeliveryReceipt({
    deliveryId: req.params.id,
    file: req.file,
  });
  ok(res, HTTP_STATUS.CREATED, delivery);
});
