import { AppDataSource } from '../../../config/data-source.js';
import { Payment, Refund } from '../../../database/entities/index.js';

type AggregateRow = { method: string; count: string; amount: string };

function toCents(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
}

function money(cents: bigint): string {
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

export const cashierReportService = {
  async get(from: string, to: string) {
    // MySQL TIMESTAMP columns are interpreted in the configured database session timezone.
    const end = new Date(`${to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    const exclusiveEnd = end.toISOString().slice(0, 10);
    const { payments, refunds } = await AppDataSource.transaction('REPEATABLE READ', async (manager) => {
      const payments = await manager.getRepository(Payment).createQueryBuilder('entry')
        .select('entry.method', 'method').addSelect('COUNT(*)', 'count').addSelect('SUM(entry.amount)', 'amount')
        .where('entry.paid_at >= :from AND entry.paid_at < :end', { from, end: exclusiveEnd })
        .groupBy('entry.method').getRawMany<AggregateRow>();
      const refunds = await manager.getRepository(Refund).createQueryBuilder('entry')
        .select('entry.method', 'method').addSelect('COUNT(*)', 'count').addSelect('SUM(entry.amount)', 'amount')
        .where('entry.refunded_at >= :from AND entry.refunded_at < :end', { from, end: exclusiveEnd })
        .groupBy('entry.method').getRawMany<AggregateRow>();
      return { payments, refunds };
    });
    const methods = [...new Set([...payments, ...refunds].map((row) => row.method))].sort();
    const rows = methods.map((method) => {
      const receipt = payments.find((row) => row.method === method);
      const refund = refunds.find((row) => row.method === method);
      const receivedCents = toCents(receipt?.amount ?? '0.00');
      const refundedCents = toCents(refund?.amount ?? '0.00');
      return { method, paymentCount: Number(receipt?.count ?? 0), refundCount: Number(refund?.count ?? 0), received: money(receivedCents), refunded: money(refundedCents), net: money(receivedCents - refundedCents) };
    });
    const total = (key: 'received' | 'refunded' | 'net') => money(rows.reduce((sum, row) => sum + toCents(row[key]), 0n));
    return { from, to, timezone: 'database session local time', rows, totals: { received: total('received'), refunded: total('refunded'), net: total('net'), paymentCount: rows.reduce((sum, row) => sum + row.paymentCount, 0), refundCount: rows.reduce((sum, row) => sum + row.refundCount, 0) } };
  },
};
