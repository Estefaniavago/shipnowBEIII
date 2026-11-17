import { logService } from '../services/index.js';
import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

export const testLogger = asyncHandler((req, res) => {
  const result = logService.emitTestLogs();
  res.status(HTTP_STATUS.OK).json({
    status: RESPONSE_STATUS.SUCCESS,
    message: 'Se emitió un log por cada nivel. Los niveles por debajo del nivel activo no se registran.',
    payload: result,
  });
});
