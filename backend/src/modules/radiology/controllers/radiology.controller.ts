import type { Request, Response } from 'express';
import { radiologyService } from '../services/radiology.service.js';
export const radiologyController = {
  listModalities: async (_req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listModalities() }),
  doctorCandidates: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.doctorCandidates(String(req.query.search)) }),
  listOrders: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listOrders(req.query as { patientId?: number; status?: any }) }),
  createOrder: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await radiologyService.createOrder(req.body, req.user?.id ?? null) }),
  updateReport: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.updateReport(Number(req.params.id), req.body, req.user?.id ?? null) }),
  listAddenda: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listAddenda(Number(req.params.id)) }),
  addAddendum: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await radiologyService.addAddendum(Number(req.params.id), req.body, req.user?.id ?? null) }),
  listCommunications: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listCommunications(Number(req.params.id)) }),
  recordCommunication: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await radiologyService.recordCommunication(Number(req.params.id), req.body, req.user?.id ?? null) }),
};
