import type { Request, Response } from 'express'; import { auditService } from '../services/audit.service.js';
export const auditController = { list: async (req: Request, res: Response) => res.json({ success: true, data: await auditService.list(req.query as any) }) };
