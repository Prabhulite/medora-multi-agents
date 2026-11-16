import type { Request, Response } from 'express';
import { operationsService } from '../services/operations.service.js';
function csvCell(value: unknown): string { const text = String(value ?? ''); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
export const operationsController = {
  dashboard: async (req: Request, res: Response) => res.json({ success: true, data: await operationsService.dashboard(typeof req.query.date === 'string' ? req.query.date : undefined) }),
  dashboardCsv: async (req: Request, res: Response) => { const data = await operationsService.dashboard(typeof req.query.date === 'string' ? req.query.date : undefined); const rows: string[][] = [['section', 'item', 'detail', 'status', 'timestamp']]; for (const [section, items] of Object.entries(data.queues)) for (const item of items as any[]) rows.push([section, item.patient?.fullName || item.orderNumber || item.admissionNumber || item.invoiceNumber || item.medication?.brandName || item.test?.testName || item.modality?.modalityName || String(item.id), item.patient?.mrdNumber || item.status || '', item.status || '', item.createdAt || item.orderedAt || item.admittedAt || '']); const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n'); res.status(200).type('text/csv').setHeader('Content-Disposition', `attachment; filename="medora-operations-${data.date}.csv"`).send(csv); },
};
