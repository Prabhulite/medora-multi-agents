import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { surgeryService } from '../services/surgery.service.js';

export const surgeryController = {
  async rooms(_req: Request, res: Response) { return sendSuccess(res, await surgeryService.rooms(), 'Operating rooms fetched'); },
  async cases(req: Request, res: Response) { return sendSuccess(res, await surgeryService.cases({ status: typeof req.query.status === 'string' ? req.query.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled' : undefined, patientId: req.query.patientId ? Number(req.query.patientId) : undefined }), 'Surgery cases fetched'); },
  async schedule(req: Request, res: Response) { return sendCreated(res, await surgeryService.schedule(req.body, req.user?.id ?? null), 'Surgery scheduled'); },
  async action(req: Request, res: Response) { return sendSuccess(res, await surgeryService.action(Number(req.params.id), req.body, req.user?.id ?? null), 'Surgery case updated'); },
};
