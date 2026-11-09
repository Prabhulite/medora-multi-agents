import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/utils/response.js';
import { hospitalProfileService } from '../services/hospital-profile.service.js';

export const hospitalProfileController = {
  async get(_req: Request, res: Response) {
    const profile = await hospitalProfileService.get();
    return sendSuccess(res, profile, 'Hospital profile fetched');
  },

  async upsert(req: Request, res: Response) {
    const profile = await hospitalProfileService.upsert(req.body);
    return sendSuccess(res, profile, 'Hospital profile saved');
  },
};
