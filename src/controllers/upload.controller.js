import { uploadService } from '../services/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

const created = (res, payload) =>
  res.status(HTTP_STATUS.CREATED).json({ status: RESPONSE_STATUS.SUCCESS, payload });

export const uploadUserDocument = asyncHandler(async (req, res) => {
  created(res, await uploadService.attachUserDocument({
    userId: req.params.id,
    file: req.file,
    documentType: req.body.documentType,
  }));
});

export const uploadOrderReceipt = asyncHandler(async (req, res) => {
  created(res, await uploadService.attachOrderReceipt({ orderId: req.params.id, file: req.file }));
});

export const uploadDeliveryReceipt = asyncHandler(async (req, res) => {
  created(res, await uploadService.attachDeliveryReceipt({ deliveryId: req.params.id, file: req.file }));
});
