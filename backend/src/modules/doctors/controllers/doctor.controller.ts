import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { doctorService } from '../services/doctor.service.js';

export const doctorController = {
  async list(_req: Request, res: Response) {
    return sendSuccess(res, await doctorService.list(), 'Doctors fetched');
  },

  async getById(req: Request, res: Response) {
    return sendSuccess(res, await doctorService.getById(Number(req.params.id)), 'Doctor fetched');
  },

  async create(req: Request, res: Response) {
    return sendCreated(res, await doctorService.create(req.body), 'Doctor created');
  },

  async update(req: Request, res: Response) {
    return sendSuccess(
      res,
      await doctorService.update(Number(req.params.id), req.body),
      'Doctor updated',
    );
  },

  async remove(req: Request, res: Response) {
    await doctorService.remove(Number(req.params.id));
    return sendSuccess(res, null, 'Doctor deleted');
  },
};
