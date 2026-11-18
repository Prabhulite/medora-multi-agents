import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { serviceCategoryService } from '../services/service-category.service.js';

export const serviceCategoryController = {
  async list(_req: Request, res: Response) {
    return sendSuccess(res, await serviceCategoryService.list(), 'Service categories fetched');
  },
  async listActive(_req: Request, res: Response) {
    return sendSuccess(
      res,
      await serviceCategoryService.listActive(),
      'Active service categories fetched',
    );
  },
  async getById(req: Request, res: Response) {
    return sendSuccess(
      res,
      await serviceCategoryService.getById(Number(req.params.id)),
      'Service category fetched',
    );
  },
  async create(req: Request, res: Response) {
    return sendCreated(
      res,
      await serviceCategoryService.create(req.body),
      'Service category created',
    );
  },
  async update(req: Request, res: Response) {
    return sendSuccess(
      res,
      await serviceCategoryService.update(Number(req.params.id), req.body),
      'Service category updated',
    );
  },
  async remove(req: Request, res: Response) {
    await serviceCategoryService.remove(Number(req.params.id));
    return sendSuccess(res, null, 'Service category deleted');
  },
};
