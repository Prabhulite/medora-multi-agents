import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/utils/response.js';
import { doctorWorkspaceService } from '../services/doctor-workspace.service.js';

export const doctorWorkspaceController = {
  async getMine(req: Request, res: Response) {
    return sendSuccess(res, await doctorWorkspaceService.getForUser(req.user!.id), 'Doctor workspace fetched');
  },
};
