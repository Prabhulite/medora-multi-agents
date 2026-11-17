import type { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service.js';
export const inventoryController = {
  list: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.list(req.query as { medicationId?: number; lowStock?: boolean }) }),
  patients: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.patients(String(req.query.search)) }),
  receive: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await inventoryService.receive(req.body, req.user?.id ?? null) }),
  dispense: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.dispense(req.body, req.user?.id ?? null) }),
  dispenses: async (req: Request, res: Response) => res.json({ success: true, data: await inventoryService.dispenses(Number(req.query.patientId)) }),
};
