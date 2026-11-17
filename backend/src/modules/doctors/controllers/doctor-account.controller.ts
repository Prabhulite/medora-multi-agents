import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/utils/response.js';
import { doctorAccountService } from '../services/doctor-account.service.js';

export const doctorAccountController = {
  async candidates(req: Request, res: Response) { return sendSuccess(res, await doctorAccountService.candidates(String(req.query.search)), 'Eligible staff fetched'); },
  async get(req: Request, res: Response) { return sendSuccess(res, await doctorAccountService.get(Number(req.params.id)), 'Doctor account link fetched'); },
  async link(req: Request, res: Response) { return sendSuccess(res, await doctorAccountService.link(Number(req.params.id), req.body, req.user!.id), 'Doctor account linked'); },
  async unlink(req: Request, res: Response) { return sendSuccess(res, await doctorAccountService.unlink(Number(req.params.id), req.body, req.user!.id), 'Doctor account unlinked'); },
};
