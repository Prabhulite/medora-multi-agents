import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/utils/response.js';
import { notificationService } from '../services/notification.service.js';

export const notificationController = {
  async list(req: Request, res: Response) { return sendSuccess(res, await notificationService.list(req.user!.id, req.query.beforeId ? Number(req.query.beforeId) : undefined), 'Notifications fetched'); },
  async read(req: Request, res: Response) { return sendSuccess(res, await notificationService.markRead(req.user!.id, Number(req.params.id)), 'Notification acknowledged'); },
};
