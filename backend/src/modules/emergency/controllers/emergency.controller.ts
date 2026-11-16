import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { emergencyService } from '../services/emergency.service.js';

export const emergencyController = {
  async list(req: Request, res: Response) { return sendSuccess(res, await emergencyService.list({ status: typeof req.query.status === 'string' ? req.query.status as 'waiting' | 'in_care' | 'admitted' | 'discharged' : undefined, patientId: req.query.patientId ? Number(req.query.patientId) : undefined }), 'Emergency cases fetched'); },
  async create(req: Request, res: Response) { return sendCreated(res, await emergencyService.create(req.body, req.user?.id ?? null), 'Emergency case created'); },
  async updateStatus(req: Request, res: Response) { return sendSuccess(res, await emergencyService.updateStatus(Number(req.params.id), req.body, req.user?.id ?? null), 'Emergency case updated'); },
};
