import { mockService } from '../services/index.js';

export const getUsers = (req, res, next) => {
  try {
    res.status(200).json(mockService.getUsers(req.query.qty));
  } catch (error) {
    next(error);
  }
};

export const getCouriers = (req, res, next) => {
  try {
    res.status(200).json(mockService.getCouriers(req.query.qty));
  } catch (error) {
    next(error);
  }
};

export const getOrders = (req, res, next) => {
  try {
    res.status(200).json(mockService.getOrders(req.query.qty));
  } catch (error) {
    next(error);
  }
};

export const getDeliveries = (req, res, next) => {
  try {
    res.status(200).json(mockService.getDeliveries(req.query.qty));
  } catch (error) {
    next(error);
  }
};

export const getDataset = (req, res, next) => {
  try {
    res.status(200).json(mockService.getDataset(req.query.qty));
  } catch (error) {
    next(error);
  }
};

export const seed = async (req, res, next) => {
  try {
    const { qty, type } = req.query;
    res.status(201).json(await mockService.seed({ qty, type }));
  } catch (error) {
    next(error);
  }
};

export const clear = async (req, res, next) => {
  try {
    res.status(200).json(await mockService.clear());
  } catch (error) {
    next(error);
  }
};
