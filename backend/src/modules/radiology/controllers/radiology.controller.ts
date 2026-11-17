import type { Request, Response } from 'express';
import { radiologyService } from '../services/radiology.service.js';
import type { RadiologyCommunicationQueueInput, RadiologyWorklistInput } from '../validators/radiology.validators.js';
const canViewDraft = (req: Request) => Boolean(req.user?.isSuperAdmin || req.user?.permissions.includes('radiology.update'));
export const radiologyController = {
  worklist: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.worklist(req.query as unknown as RadiologyWorklistInput, canViewDraft(req)) }),
  communicationQueue: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.communicationQueue(req.query as unknown as RadiologyCommunicationQueueInput) }),
  listModalities: async (_req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listModalities() }),
  doctorCandidates: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.doctorCandidates(String(req.query.search)) }),
  listOrders: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listOrders(req.query as { patientId?: number; status?: any }, canViewDraft(req)) }),
  createOrder: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await radiologyService.createOrder(req.body, req.user?.id ?? null) }),
  updateReport: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.updateReport(Number(req.params.id), req.body, req.user?.id ?? null) }),
  listAddenda: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listAddenda(Number(req.params.id)) }),
  addAddendum: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await radiologyService.addAddendum(Number(req.params.id), req.body, req.user?.id ?? null) }),
  listCommunications: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listCommunications(Number(req.params.id), canViewDraft(req)) }),
  recordCommunication: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await radiologyService.recordCommunication(Number(req.params.id), req.body, req.user?.id ?? null) }),
  listScheduleEvents: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listScheduleEvents(Number(req.params.id)) }),
  scheduleOrder: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.scheduleOrder(Number(req.params.id), req.body, req.user?.id ?? null) }),
  listResources: async (_req: Request, res: Response) => res.json({ success: true, data: await radiologyService.listResources() }),
  createResource: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await radiologyService.createResource(req.body) }),
  setResourceActive: async (req: Request, res: Response) => res.json({ success: true, data: await radiologyService.setResourceActive(Number(req.params.id), req.body.isActive) }),
};
