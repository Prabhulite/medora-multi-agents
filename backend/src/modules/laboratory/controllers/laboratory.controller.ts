import type { Request, Response } from 'express';
import { laboratoryService } from '../services/laboratory.service.js';
export const laboratoryController = {
  patientCandidates: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.patientCandidates(String(req.query.search)) }),
  doctorCandidates: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.doctorCandidates(String(req.query.search)) }),
  listTests: async (_req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.listTests() }),
  listAllTests: async (_req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.listAllTests() }),
  createTest: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await laboratoryService.createTest(req.body) }),
  retireTest: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.retireTest(Number(req.params.id)) }),
  reactivateTest: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.reactivateTest(Number(req.params.id)) }),
  listOrders: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.listOrders(req.query as { patientId?: number; status?: any }, Boolean(req.user?.isSuperAdmin || req.user?.permissions.some((permission) => ['laboratory.update', 'laboratory.verify', 'laboratory.release'].includes(permission)))) }),
  createOrder: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await laboratoryService.createOrder(req.body, req.user?.id ?? null) }),
  cancelOrder: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.cancelOrder(Number(req.params.id), req.body.reason, req.user!.id) }),
  collectSample: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.collectSample(Number(req.params.id), req.body, req.user?.id ?? null) }),
  updateResult: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.updateResult(Number(req.params.id), req.body, req.user?.id ?? null) }),
  verifyResult: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.verifyResult(Number(req.params.id), req.user!.id) }),
  releaseResult: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.releaseResult(Number(req.params.id), req.user!.id) }),
  listAddenda: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.listAddenda(Number(req.params.id)) }),
  addAddendum: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await laboratoryService.addAddendum(Number(req.params.id), req.body, req.user!.id) }),
  listCommunications: async (req: Request, res: Response) => res.json({ success: true, data: await laboratoryService.listCommunications(Number(req.params.id)) }),
  recordCommunication: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await laboratoryService.recordCommunication(Number(req.params.id), req.body, req.user!.id) }),
};
