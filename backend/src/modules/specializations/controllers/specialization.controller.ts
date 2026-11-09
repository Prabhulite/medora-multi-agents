import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { specializationService } from '../services/specialization.service.js';

export const specializationController = {
  async list(_req: Request, res: Response) {
    return sendSuccess(res, await specializationService.list(), 'Specializations fetched');
  },

  async listActive(_req: Request, res: Response) {
    return sendSuccess(
      res,
      await specializationService.listActive(),
      'Active specializations fetched',
    );
  },

  async getById(req: Request, res: Response) {
    return sendSuccess(
      res,
      await specializationService.getById(Number(req.params.id)),
      'Specialization fetched',
    );
  },

  async create(req: Request, res: Response) {
    return sendCreated(res, await specializationService.create(req.body), 'Specialization created');
  },

  async update(req: Request, res: Response) {
    return sendSuccess(
      res,
      await specializationService.update(Number(req.params.id), req.body),
      'Specialization updated',
    );
  },

  async remove(req: Request, res: Response) {
    await specializationService.remove(Number(req.params.id));
    return sendSuccess(res, null, 'Specialization deleted');
  },
};
