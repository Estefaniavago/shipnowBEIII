import { mockService } from '../services/index.js';
import { HTTP_STATUS } from '../constants/index.js';
import { asyncHandler } from '../utils/async.handler.js';

export const getUsers = asyncHandler((req, res) => {
  res.status(HTTP_STATUS.OK).json(mockService.getUsers(req.query.qty));
});

export const getCouriers = asyncHandler((req, res) => {
  res.status(HTTP_STATUS.OK).json(mockService.getCouriers(req.query.qty));
});

export const getOrders = asyncHandler((req, res) => {
  res.status(HTTP_STATUS.OK).json(mockService.getOrders(req.query.qty));
});

export const getDeliveries = asyncHandler((req, res) => {
  res.status(HTTP_STATUS.OK).json(mockService.getDeliveries(req.query.qty));
});

export const getDataset = asyncHandler((req, res) => {
  res.status(HTTP_STATUS.OK).json(mockService.getDataset(req.query.qty));
});

export const seed = asyncHandler(async (req, res) => {
  const { qty, type } = req.query;
  res.status(HTTP_STATUS.CREATED).json(await mockService.seed({ qty, type }));
});

export const clear = asyncHandler(async (req, res) => {
  res.status(HTTP_STATUS.OK).json(await mockService.clear());
});
