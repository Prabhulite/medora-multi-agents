import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { serviceService } from '../services/service.service.js';

export const serviceController = {
  async list(_req: Request, res: Response) {
    return sendSuccess(res, await serviceService.list(), 'Services fetched');
  },
  async listActive(_req: Request, res: Response) {
    return sendSuccess(res, await serviceService.listActive(), 'Active services fetched');
  },
  async getById(req: Request, res: Response) {
    return sendSuccess(res, await serviceService.getById(Number(req.params.id)), 'Service fetched');
  },
  async create(req: Request, res: Response) {
    return sendCreated(res, await serviceService.create(req.body), 'Service created');
  },
  async update(req: Request, res: Response) {
    return sendSuccess(
      res,
      await serviceService.update(Number(req.params.id), req.body),
      'Service updated',
    );
  },
  async remove(req: Request, res: Response) {
    await serviceService.remove(Number(req.params.id));
    return sendSuccess(res, null, 'Service deleted');
  },
};
