import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { bloodBankService } from '../services/blood-bank.service.js';
import type { UnitListQuery } from '../validators/blood-bank.validators.js';

export const bloodBankController = {
  async list(req: Request, res: Response) { return sendSuccess(res, await bloodBankService.list(req.query as UnitListQuery), 'Blood units fetched'); },
  async patients(req: Request, res: Response) { return sendSuccess(res, await bloodBankService.patients(String(req.query.search)), 'Patients fetched'); },
  async events(req: Request, res: Response) { return sendSuccess(res, await bloodBankService.events(Number(req.params.id)), 'Unit events fetched'); },
  async receive(req: Request, res: Response) { return sendCreated(res, await bloodBankService.receive(req.body, req.user!.id), 'Unit received into quarantine'); },
  async release(req: Request, res: Response) { return sendSuccess(res, await bloodBankService.release(Number(req.params.id), req.body, req.user!.id), 'Unit released'); },
  async issue(req: Request, res: Response) { return sendSuccess(res, await bloodBankService.issue(Number(req.params.id), req.body, req.user!.id), 'Unit issued'); },
  async discard(req: Request, res: Response) { return sendSuccess(res, await bloodBankService.discard(Number(req.params.id), req.body, req.user!.id), 'Unit discarded'); },
};
