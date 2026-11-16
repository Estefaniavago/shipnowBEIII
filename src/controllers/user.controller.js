import { userService } from '../services/index.js';
import { RESPONSE_STATUS } from '../constants/index.js';

export const getAll = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const users = await userService.getAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.status(200).json({ status: RESPONSE_STATUS.SUCCESS, payload: users });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    res.status(200).json({ status: RESPONSE_STATUS.SUCCESS, payload: await userService.getById(req.params.id) });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json({ status: RESPONSE_STATUS.SUCCESS, payload: await userService.create(req.body) });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    res.status(200).json({ status: RESPONSE_STATUS.SUCCESS, payload: await userService.update(req.params.id, req.body) });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    await userService.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
