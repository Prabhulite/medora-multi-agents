import type { Request, Response } from 'express';
import { procurementService } from '../services/procurement.service.js';
export const procurementController = {
  listSuppliers: async (_req: Request, res: Response) => res.json({ success: true, data: await procurementService.listSuppliers() }),
  createSupplier: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await procurementService.createSupplier(req.body) }),
  listOrders: async (_req: Request, res: Response) => res.json({ success: true, data: await procurementService.listOrders() }),
  createOrder: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await procurementService.createOrder(req.body, req.user?.id ?? null) }),
  receiveOrder: async (req: Request, res: Response) => res.json({ success: true, data: await procurementService.receiveOrder(Number(req.params.id), req.body, req.user?.id ?? null) }),
  listInvoices: async (_req: Request, res: Response) => res.json({ success: true, data: await procurementService.listInvoices() }),
  createInvoice: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await procurementService.createInvoice(req.body) }),
  createPayment: async (req: Request, res: Response) => res.status(201).json({ success: true, data: await procurementService.createPayment(Number(req.params.id), req.body, req.user?.id ?? null) }),
};
