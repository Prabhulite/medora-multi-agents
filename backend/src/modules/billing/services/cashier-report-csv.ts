import type { cashierReportService } from './cashier-report.service.js';

type CashierReport = Awaited<ReturnType<typeof cashierReportService.get>>;

function cell(value: string | number | null, numeric = false): string {
  const raw = String(value ?? '');
  const safe = numeric && /^-?\d+(?:\.\d{2})?$/.test(raw) ? raw : /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function cashierReportCsv(report: CashierReport): string {
  const rows: Array<Array<string | number | null>> = [
    ['Cashier report', report.from, report.to, report.timezone],
    ['section', 'name', 'payments', 'received', 'refunds', 'refunded', 'net'],
    ...report.rows.map((row) => ['payment_method', row.method, row.paymentCount, row.received, row.refundCount, row.refunded, row.net]),
    ...report.cashiers.map((row) => ['cashier', row.cashierName, row.paymentCount, row.received, row.refundCount, row.refunded, row.net]),
    ['total', 'All methods', report.totals.paymentCount, report.totals.received, report.totals.refundCount, report.totals.refunded, report.totals.net],
  ];
  return '\uFEFF' + rows.map((row, rowIndex) => row.map((value, columnIndex) => cell(value, rowIndex >= 2 && columnIndex >= 2)).join(',')).join('\r\n') + '\r\n';
}
