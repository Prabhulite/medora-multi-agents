import { MoreThanOrEqual, LessThan, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Admission, Appointment, Bed, Invoice, InventoryBatch, LaboratoryOrder, RadiologyOrder } from '../../../database/entities/index.js';

function dayBounds(date = new Date()) { const start = new Date(date); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); return { start, end }; }

export const operationsService = {
  async dashboard(date?: string) {
    const bounds = dayBounds(date ? new Date(`${date}T00:00:00`) : new Date());
    const appointmentRepo = AppDataSource.getRepository(Appointment);
    const [appointments, admissions, openInvoices, lowStock, expiringStock, pendingLab, pendingRadiology, bedsAvailable] = await Promise.all([
      appointmentRepo.find({ where: { appointmentDate: date ?? new Date().toISOString().slice(0, 10) }, relations: { patient: true, doctor: true }, order: { appointmentTime: 'ASC' }, take: 12 }),
      AppDataSource.getRepository(Admission).find({ where: { status: In(['admitted', 'transferred']) }, relations: { patient: true, bed: { ward: true } }, order: { admittedAt: 'DESC' }, take: 10 }),
      AppDataSource.getRepository(Invoice).find({ where: { status: In(['open', 'partially_paid']) }, relations: { patient: true }, order: { createdAt: 'DESC' }, take: 10 }),
      AppDataSource.getRepository(InventoryBatch).find({ where: { isActive: true }, relations: { medication: true }, order: { quantity: 'ASC' }, take: 10 }).then((rows) => rows.filter((row) => row.quantity <= row.reorderLevel)),
      AppDataSource.getRepository(InventoryBatch).find({ where: { isActive: true, expiryDate: LessThan(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)) }, relations: { medication: true }, order: { expiryDate: 'ASC' }, take: 10 }),
      AppDataSource.getRepository(LaboratoryOrder).find({ where: { status: In(['ordered', 'collected', 'processing']) }, relations: { patient: true, test: true }, order: { orderedAt: 'ASC' }, take: 10 }),
      AppDataSource.getRepository(RadiologyOrder).find({ where: { status: In(['ordered', 'scheduled', 'performed']) }, relations: { patient: true, modality: true }, order: { orderedAt: 'ASC' }, take: 10 }),
      AppDataSource.getRepository(Bed).count({ where: { status: 'available' } }),
    ]);
    const appointmentCounts = appointments.reduce<Record<string, number>>((acc, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {});
    const balance = openInvoices.reduce((sum, invoice) => sum + Number(invoice.balanceAmount), 0);
    const alerts = [
      ...(lowStock.length ? [{ id: 'low-stock', title: 'Pharmacy stock below reorder level', detail: 'Review replenishment needs.', severity: 'warning', count: lowStock.length }] : []),
      ...(expiringStock.length ? [{ id: 'expiring-stock', title: 'Medication expiry watch', detail: 'Review batches expiring within 90 days.', severity: 'warning', count: expiringStock.length }] : []),
      ...(openInvoices.length ? [{ id: 'billing-balance', title: 'Outstanding patient balances', detail: 'Follow up on open invoices.', severity: 'info', count: openInvoices.length }] : []),
    ];
    return { date: bounds.start.toISOString().slice(0, 10), generatedAt: new Date().toISOString(), kpis: { appointmentsToday: appointments.length, appointmentsWaiting: appointmentCounts.waiting ?? 0, admissionsActive: admissions.length, bedsAvailable, billingOutstanding: Number(balance.toFixed(2)), lowStockItems: lowStock.length, labPending: pendingLab.length, radiologyPending: pendingRadiology.length }, queues: { appointments, admissions, billing: openInvoices, laboratory: pendingLab, radiology: pendingRadiology }, alerts };
  },
};
