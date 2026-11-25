import { healthService } from '../services/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

export const check = asyncHandler((req, res) => {
  res.status(HTTP_STATUS.OK).json({ status: RESPONSE_STATUS.SUCCESS, payload: healthService.check() });
});
