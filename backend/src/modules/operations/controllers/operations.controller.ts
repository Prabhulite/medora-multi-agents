import type { Request, Response } from 'express';
import { operationsService } from '../services/operations.service.js';

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

type ExportItem = {
  id: number;
  patient?: { firstName?: string; middleName?: string | null; lastName?: string | null; mrdNumber?: string };
  orderNumber?: string;
  admissionNumber?: string;
  invoiceNumber?: string;
  status?: string;
  createdAt?: Date;
  orderedAt?: Date;
  admittedAt?: Date;
};

export const operationsController = {
  async dashboard(req: Request, res: Response) {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    return res.json({ success: true, data: await operationsService.dashboard(date) });
  },
  async dashboardCsv(req: Request, res: Response) {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const data = await operationsService.dashboard(date);
    const rows: string[][] = [['section', 'item', 'detail', 'status', 'timestamp']];
    for (const [metric, value] of Object.entries(data.kpis)) {
      rows.push(['kpi', metric, String(value), '', data.generatedAt]);
    }
    for (const alert of data.alerts) {
      rows.push(['alert', alert.title, String(alert.count), alert.severity, data.generatedAt]);
    }
    for (const [section, items] of Object.entries(data.queues)) {
      for (const item of items as ExportItem[]) {
        const patientName = [item.patient?.firstName, item.patient?.middleName, item.patient?.lastName].filter(Boolean).join(' ');
        rows.push([
          section,
          patientName || item.orderNumber || item.admissionNumber || item.invoiceNumber || String(item.id),
          item.patient?.mrdNumber || item.status || '',
          item.status || '',
          String(item.createdAt || item.orderedAt || item.admittedAt || ''),
        ]);
      }
    }
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    return res.status(200).type('text/csv').setHeader('Content-Disposition', `attachment; filename="medora-operations-${data.date}.csv"`).send(csv);
  },
};
