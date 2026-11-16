import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { rosterService } from '../services/roster.service.js';
import type { ShiftListQuery } from '../validators/roster.validators.js';

export const rosterController = {
  async staff(_req: Request, res: Response) { return sendSuccess(res, await rosterService.staff(), 'Staff fetched'); },
  async shifts(req: Request, res: Response) { return sendSuccess(res, await rosterService.list(req.query as unknown as ShiftListQuery), 'Shifts fetched'); },
  async create(req: Request, res: Response) { return sendCreated(res, await rosterService.create(req.body, req.user?.id ?? null), 'Shift scheduled'); },
  async close(req: Request, res: Response) { return sendSuccess(res, await rosterService.close(Number(req.params.id), req.body, req.user?.id ?? null), 'Shift updated'); },
};
