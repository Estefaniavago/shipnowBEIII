import { productService } from '../services/index.js';
import { RESPONSE_STATUS } from '../constants/index.js';

export const getAll = async (req, res, next) => {
  try {
    const { includeOutOfStock, page, limit } = req.query;
    const products = await productService.getAll({
      includeOutOfStock: includeOutOfStock === 'true',
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({ status: RESPONSE_STATUS.SUCCESS, payload: products });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    res.status(200).json({ status: RESPONSE_STATUS.SUCCESS, payload: await productService.getById(req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json({ status: RESPONSE_STATUS.SUCCESS, payload: await productService.create(req.body) });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    res.status(200).json({ status: RESPONSE_STATUS.SUCCESS, payload: await productService.update(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await productService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
