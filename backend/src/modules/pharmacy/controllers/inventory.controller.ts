import type { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service.js';
import type { StockMovementListInput } from '../validators/inventory.validators.js';
export const inventoryController = {
  list: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.list(req.query as { medicationId?: number; lowStock?: boolean }) }),
  patients: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.patients(String(req.query.search)) }),
  movements: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.movements(Number(req.params.id), req.query as unknown as StockMovementListInput) }),
  adjust: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.adjust(Number(req.params.id), req.body, req.user!.id) }),
  quarantine: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.setQuarantine(Number(req.params.id), true, req.body.reason, req.user!.id) }),
  release: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.setQuarantine(Number(req.params.id), false, req.body.reason, req.user!.id) }),
  receive: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await inventoryService.receive(req.body, req.user?.id ?? null) }),
  dispense: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.dispense(req.body, req.user?.id ?? null) }),
  dispenses: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.dispenses(Number(req.query.patientId)) }),
};
