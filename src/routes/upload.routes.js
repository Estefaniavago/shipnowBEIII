import { Router } from 'express';
import { UPLOAD } from '../constants/index.js';
import { UPLOAD_CATEGORIES } from '../config/multer.config.js';
import { uploadUserDocument, uploadOrderReceipt, uploadDeliveryReceipt } from '../controllers/upload.controller.js';
import { setUploadCategory, uploadSingle } from '../middlewares/upload.middleware.js';

const router = Router();
const file = uploadSingle(UPLOAD.FIELD_NAME);

router.post(
  '/users/:id/documents',
  setUploadCategory(UPLOAD_CATEGORIES.USER_DOCUMENTS),
  file,
  uploadUserDocument,
);
router.post(
  '/orders/:id/receipts',
  setUploadCategory(UPLOAD_CATEGORIES.ORDER_RECEIPTS),
  file,
  uploadOrderReceipt,
);
router.post(
  '/deliveries/:id/receipts',
  setUploadCategory(UPLOAD_CATEGORIES.DELIVERY_RECEIPTS),
  file,
  uploadDeliveryReceipt,
);

export default router;
