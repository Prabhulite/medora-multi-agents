import type { cashierReportService } from './cashier-report.service.js';

type CashierReport = Awaited<ReturnType<typeof cashierReportService.get>>;

function cell(value: string | number | null): string {
  const raw = String(value ?? '');
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
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
  return '\uFEFF' + rows.map((row) => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
