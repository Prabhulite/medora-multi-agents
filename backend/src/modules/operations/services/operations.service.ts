import { In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Admission, Appointment, Bed, Invoice, InventoryBatch, LaboratoryOrder, RadiologyOrder } from '../../../database/entities/index.js';

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const operationsService = {
  async dashboard(date?: string) {
    const reportDate = date ?? localDate();
    const appointmentRepo = AppDataSource.getRepository(Appointment);
    const admissionRepo = AppDataSource.getRepository(Admission);
    const invoiceRepo = AppDataSource.getRepository(Invoice);
    const batchRepo = AppDataSource.getRepository(InventoryBatch);
    const labRepo = AppDataSource.getRepository(LaboratoryOrder);
    const radiologyRepo = AppDataSource.getRepository(RadiologyOrder);
    const [appointments, admissions, openInvoices, pendingLab, pendingRadiology, bedsAvailable, appointmentsToday, appointmentsWaiting, admissionsActive, invoiceTotals, lowStockItems, expiredStockCount, expiringStockCount, labPending, radiologyPending] = await Promise.all([
      appointmentRepo.find({ where: { appointmentDate: reportDate }, relations: { patient: true, doctor: true }, order: { appointmentTime: 'ASC' }, take: 12 }),
      admissionRepo.find({ where: { status: In(['admitted', 'transferred']) }, relations: { patient: true, bed: { ward: true } }, order: { admittedAt: 'DESC' }, take: 10 }),
      invoiceRepo.find({ where: { status: In(['open', 'partially_paid']) }, relations: { patient: true }, order: { createdAt: 'DESC' }, take: 10 }),
      labRepo.find({ where: { status: In(['ordered', 'collected', 'processing', 'verified']) }, relations: { patient: true, test: true }, order: { orderedAt: 'ASC' }, take: 10 }),
      radiologyRepo.find({ where: { status: In(['ordered', 'scheduled', 'performed']) }, relations: { patient: true, modality: true }, order: { orderedAt: 'ASC' }, take: 10 }),
      AppDataSource.getRepository(Bed).count({ where: { status: 'available' } }),
      appointmentRepo.count({ where: { appointmentDate: reportDate } }),
      appointmentRepo.count({ where: { appointmentDate: reportDate, status: 'checked_in' } }),
      admissionRepo.count({ where: { status: In(['admitted', 'transferred']) } }),
      invoiceRepo.createQueryBuilder('invoice').select('COUNT(*)', 'count').addSelect('COALESCE(SUM(invoice.balanceAmount), 0)', 'balance').where('invoice.status IN (:...statuses)', { statuses: ['open', 'partially_paid'] }).getRawOne<{ count: string; balance: string }>(),
      batchRepo.createQueryBuilder('batch').where('batch.isActive = 1 AND batch.expiry_date >= CURRENT_DATE() AND batch.quantity <= batch.reorder_level').getCount(),
      batchRepo.createQueryBuilder('batch').where('batch.isActive = 1 AND batch.quantity > 0 AND batch.expiry_date < CURRENT_DATE()').getCount(),
      batchRepo.createQueryBuilder('batch').where('batch.isActive = 1 AND batch.quantity > 0 AND batch.expiry_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY)').getCount(),
      labRepo.count({ where: { status: In(['ordered', 'collected', 'processing', 'verified']) } }),
      radiologyRepo.count({ where: { status: In(['ordered', 'scheduled', 'performed']) } }),
    ]);
    const openInvoiceCount = Number(invoiceTotals?.count ?? 0);
    const balance = Number(invoiceTotals?.balance ?? 0);
    const alerts = [
      ...(lowStockItems ? [{ id: 'low-stock', title: 'Pharmacy stock below reorder level', detail: 'Review replenishment needs.', severity: 'warning', count: lowStockItems }] : []),
      ...(expiredStockCount ? [{ id: 'expired-stock', title: 'Expired medication stock', detail: 'Quarantine and reconcile expired batches.', severity: 'warning', count: expiredStockCount }] : []),
      ...(expiringStockCount ? [{ id: 'expiring-stock', title: 'Medication expiry watch', detail: 'Review batches expiring within 90 days.', severity: 'warning', count: expiringStockCount }] : []),
      ...(openInvoiceCount ? [{ id: 'billing-balance', title: 'Outstanding patient balances', detail: 'Follow up on open invoices.', severity: 'info', count: openInvoiceCount }] : []),
    ];
    return { date: reportDate, generatedAt: new Date().toISOString(), kpis: { appointmentsToday, appointmentsWaiting, admissionsActive, bedsAvailable, billingOutstanding: Number(balance.toFixed(2)), lowStockItems, labPending, radiologyPending }, queues: { appointments, admissions, billing: openInvoices, laboratory: pendingLab, radiology: pendingRadiology }, alerts };
  },
};
