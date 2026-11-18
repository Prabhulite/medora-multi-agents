import { AppDataSource } from '../../../config/data-source.js';
import { Invoice } from '../../../database/entities/index.js';

type Bucket = 'undated' | 'current' | '1_30' | '31_60' | '61_90' | '91_plus';
type Aggregate = { bucket: Bucket; count: string; amount: string };
type Detail = { id: number; invoiceNumber: string; patientId: number; patientName: string; patientMrdNumber: string; dueDate: string | null; status: string; balanceAmount: string; daysOverdue: number | null };

const bucketSql = `CASE
  WHEN invoice.due_date IS NULL THEN 'undated'
  WHEN invoice.due_date >= :today THEN 'current'
  WHEN invoice.due_date >= DATE_SUB(:today, INTERVAL 30 DAY) THEN '1_30'
  WHEN invoice.due_date >= DATE_SUB(:today, INTERVAL 60 DAY) THEN '31_60'
  WHEN invoice.due_date >= DATE_SUB(:today, INTERVAL 90 DAY) THEN '61_90'
  ELSE '91_plus' END`;
const buckets: Bucket[] = ['undated', 'current', '1_30', '31_60', '61_90', '91_plus'];

export const receivablesReportService = {
  async get(page: number, pageSize: number, bucket?: Bucket) {
    return AppDataSource.transaction('REPEATABLE READ', async (manager) => {
      const [clock] = await manager.query("SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS today");
      const today: string = clock.today;
      const base = manager.getRepository(Invoice).createQueryBuilder('invoice')
        .where('invoice.status IN (:...statuses) AND invoice.balance_amount > 0', { statuses: ['open', 'partially_paid'], today });
      const aggregates = await base.clone().select(bucketSql, 'bucket').addSelect('COUNT(*)', 'count').addSelect('SUM(invoice.balance_amount)', 'amount').groupBy(bucketSql).getRawMany<Aggregate>();
      const rows = buckets.map((key) => {
        const item = aggregates.find((row) => row.bucket === key);
        return { bucket: key, count: Number(item?.count ?? 0), amount: item?.amount ?? '0.00' };
      });
      const outstandingCents = rows.reduce((sum, row) => { const [whole, fraction = ''] = row.amount.split('.'); return sum + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')); }, 0n);
      const totalOutstanding = `${outstandingCents / 100n}.${String(outstandingCents % 100n).padStart(2, '0')}`;
      const detail = base.clone();
      if (bucket) detail.andWhere(`${bucketSql} = :bucket`, { bucket });
      const total = await detail.clone().getCount();
      const items = await detail.innerJoin('invoice.patient', 'patient')
        .select('invoice.id', 'id').addSelect('invoice.invoiceNumber', 'invoiceNumber')
        .addSelect('invoice.patientId', 'patientId')
        .addSelect("CONCAT_WS(' ', patient.firstName, patient.middleName, patient.lastName)", 'patientName')
        .addSelect('patient.mrdNumber', 'patientMrdNumber')
        .addSelect('invoice.dueDate', 'dueDate').addSelect('invoice.status', 'status')
        .addSelect('invoice.balanceAmount', 'balanceAmount')
        .addSelect('CASE WHEN invoice.due_date < :today THEN DATEDIFF(:today, invoice.due_date) ELSE NULL END', 'daysOverdue')
        .orderBy('CASE WHEN invoice.due_date IS NULL THEN 1 ELSE 0 END', 'ASC')
        .addOrderBy('invoice.dueDate', 'ASC').addOrderBy('invoice.id', 'ASC')
        .limit(pageSize).offset((page - 1) * pageSize).getRawMany<Detail>();
      return { asOf: today, timezone: 'database session local date', totalOutstanding, buckets: rows, total, page, pageSize, items };
    });
  },
};
