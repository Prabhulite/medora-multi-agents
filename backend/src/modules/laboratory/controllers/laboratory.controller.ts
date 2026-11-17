import type { Request, Response } from 'express';
import { laboratoryService } from '../services/laboratory.service.js';
export const laboratoryController = {
  listTests: async (_req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.listTests() }),
  listOrders: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.listOrders(req.query as { patientId?: number; status?: any }, Boolean(req.user?.isSuperAdmin || req.user?.permissions.some((permission) => ['laboratory.update', 'laboratory.verify', 'laboratory.release'].includes(permission)))) }),
  createOrder: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await laboratoryService.createOrder(req.body, req.user?.id ?? null) }),
  collectSample: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.collectSample(Number(req.params.id), req.body, req.user?.id ?? null) }),
  updateResult: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.updateResult(Number(req.params.id), req.body, req.user?.id ?? null) }),
  verifyResult: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.verifyResult(Number(req.params.id), req.user!.id) }),
  releaseResult: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.releaseResult(Number(req.params.id), req.user!.id) }),
};
