import { AppDataSource } from '../../../config/data-source.js';
import { CashierCloseout, ChargeMaster, InsuranceClaim, Invoice, InvoiceItem, Patient, Payment, Refund, User } from '../../../database/entities/index.js';
import type { EntityManager } from 'typeorm';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CloseoutInput, CreateInvoiceInput, PaymentInput, RefundInput } from '../validators/billing.validators.js';

const cents = (value: number | string) => Math.round(Number(value) * 100);
const refundResponse = (row: Refund | null) => row ? { ...row, createdBy: row.createdBy ? { id: row.createdBy.id, fullName: row.createdBy.fullName } : null } : null;
const toCents = (value: string) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')); };
const money = (value: bigint) => `${value < 0n ? '-' : ''}${(value < 0n ? -value : value) / 100n}.${((value < 0n ? -value : value) % 100n).toString().padStart(2, '0')}`;
async function lockCashier(manager: EntityManager, userId: number | null): Promise<{ date: string; postedAt: Date }> {
  if (userId === null) throw new ValidationError('Cash posting requires an authenticated cashier');
  const user = await manager.getRepository(User).createQueryBuilder('user').setLock('pessimistic_write').where('user.id = :userId', { userId }).getOne();
  if (!user) throw new NotFoundError('Cashier not found');
  // Capture the DB-local posting time and its calendar date in one statement while holding the user lock.
  const [clock] = await manager.query("SELECT NOW(6) AS postedAt, DATE_FORMAT(NOW(6), '%Y-%m-%d') AS businessDate");
  const date: string = clock.businessDate;
  if (await manager.getRepository(CashierCloseout).exist({ where: { cashierId: userId, businessDate: date } })) throw new ConflictError('Cashier day is already closed');
  return { date, postedAt: clock.postedAt };
}
const closeoutResponse = (row: CashierCloseout) => ({ id: row.id, businessDate: row.businessDate, cashierId: row.cashierId, cashierName: row.cashier.fullName, cashReceived: row.cashReceived, cashRefunded: row.cashRefunded, expectedCash: row.expectedCash, countedCash: row.countedCash, variance: row.variance, reason: row.reason, closedAt: row.closedAt });

export const billingService = {
  async closeouts(date: string) {
    const rows = await AppDataSource.getRepository(CashierCloseout).find({ where: { businessDate: date }, relations: { cashier: true }, order: { id: 'ASC' } });
    return rows.map(closeoutResponse);
  },
  async closeout(input: CloseoutInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const { date } = await lockCashier(manager, userId);
      const [end] = await manager.query('SELECT DATE_FORMAT(DATE_ADD(?, INTERVAL 1 DAY), \'%Y-%m-%d\') AS nextDate', [date]);
      const [received] = await manager.query('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE created_by_id = ? AND method = \'cash\' AND paid_at >= ? AND paid_at < ?', [userId, date, end.nextDate]);
      const [refunded] = await manager.query('SELECT COALESCE(SUM(amount), 0) AS total FROM refunds WHERE created_by_id = ? AND method = \'cash\' AND refunded_at >= ? AND refunded_at < ?', [userId, date, end.nextDate]);
      const cashReceived = toCents(String(received.total));
      const cashRefunded = toCents(String(refunded.total));
      const expected = cashReceived - cashRefunded;
      const counted = toCents(input.countedCash.toFixed(2));
      const variance = counted - expected;
      const reason = input.reason?.trim() || null;
      if (variance !== 0n && (!reason || reason.length < 3)) throw new ValidationError('Reason must have at least 3 characters when cash varies');
      const repo = manager.getRepository(CashierCloseout);
      const saved = await repo.save(repo.create({ businessDate: date, cashierId: userId!, cashReceived: money(cashReceived), cashRefunded: money(cashRefunded), expectedCash: money(expected), countedCash: money(counted), variance: money(variance), reason }));
      return closeoutResponse((await repo.findOne({ where: { id: saved.id }, relations: { cashier: true } }))!);
    });
  },
  async receipt(paymentId: number) {
    return AppDataSource.transaction('REPEATABLE READ', async (manager) => {
      const payment = await manager.getRepository(Payment).createQueryBuilder('payment')
        .innerJoinAndSelect('payment.invoice', 'invoice')
        .innerJoinAndSelect('invoice.patient', 'patient')
        .select(['payment.id', 'payment.amount', 'payment.method', 'payment.referenceNumber', 'payment.paidAt', 'invoice.id', 'invoice.invoiceNumber', 'patient.firstName', 'patient.middleName', 'patient.lastName', 'patient.mrdNumber'])
        .where('payment.id = :paymentId', { paymentId }).getOne();
      if (!payment) throw new NotFoundError('Payment not found');
      const refunds = await manager.getRepository(Refund).find({ where: { paymentId }, select: { id: true, amount: true, refundedAt: true }, order: { refundedAt: 'ASC', id: 'ASC' } });
      const toCents = (amount: string) => { const [whole, fraction = ''] = amount.split('.'); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')); };
      const toMoney = (value: bigint) => `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
      const totalRefunded = refunds.reduce((sum, refund) => sum + toCents(refund.amount), 0n);
      return {
        paymentId: payment.id, invoiceId: payment.invoice.id, invoiceNumber: payment.invoice.invoiceNumber,
        patientName: [payment.invoice.patient.firstName, payment.invoice.patient.middleName, payment.invoice.patient.lastName].filter(Boolean).join(' '),
        patientMrdNumber: payment.invoice.patient.mrdNumber, paidAt: payment.paidAt,
        amount: toMoney(toCents(payment.amount)), method: payment.method, referenceNumber: payment.referenceNumber,
        refunds: refunds.map((refund) => ({ id: refund.id, amount: toMoney(toCents(refund.amount)), refundedAt: refund.refundedAt })),
        totalRefunded: toMoney(totalRefunded), netPaid: toMoney(toCents(payment.amount) - totalRefunded),
      };
    });
  },
  list(filters: { patientId?: number; status?: string }) {
    return AppDataSource.getRepository(Invoice).find({ where: { ...(filters.patientId ? { patientId: filters.patientId } : {}), ...(filters.status ? { status: filters.status as Invoice['status'] } : {}) }, relations: { patient: true, items: true, payments: true }, order: { createdAt: 'DESC' } });
  },
  async refunds(invoiceId: number) {
    if (!(await AppDataSource.getRepository(Invoice).exist({ where: { id: invoiceId } }))) throw new NotFoundError('Invoice not found');
    return (await AppDataSource.getRepository(Refund).find({ where: { invoiceId }, relations: { payment: true, createdBy: true }, order: { refundedAt: 'DESC' } })).map(refundResponse);
  },
  async create(input: CreateInvoiceInput, userId: number | null) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: input.patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    return AppDataSource.transaction(async (manager) => {
      const charges = new Map<number, ChargeMaster>();
      for (const id of [...new Set(input.items.map((item) => item.chargeId).filter((id): id is number => !!id))].sort((a, b) => a - b)) {
        const charge = await manager.getRepository(ChargeMaster).createQueryBuilder('charge').setLock('pessimistic_read').where('charge.id = :id', { id }).getOne();
        if (!charge || !charge.isActive) throw new ValidationError('Selected charge is invalid or inactive');
        charges.set(id, charge);
      }
      const items = input.items.map((item) => {
        const charge = item.chargeId ? charges.get(item.chargeId) : null;
        return { chargeId: charge?.id ?? null, description: charge?.name ?? item.description, quantity: item.quantity, unitPrice: charge ? Number(charge.unitPrice) : item.unitPrice };
      });
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const total = Math.max(0, subtotal - input.discount + input.tax);
      const invoice = await manager.getRepository(Invoice).save(manager.getRepository(Invoice).create({ invoiceNumber: await nextSequenceNumber(manager, 'INV', 'INV', 6), patientId: input.patientId, status: 'open', subtotal: subtotal.toFixed(2), discount: input.discount.toFixed(2), tax: input.tax.toFixed(2), total: total.toFixed(2), paidAmount: '0.00', balanceAmount: total.toFixed(2), dueDate: input.dueDate ?? null, notes: input.notes ?? null, createdById: userId }));
      await manager.getRepository(InvoiceItem).save(items.map((item) => manager.getRepository(InvoiceItem).create({ invoiceId: invoice.id, chargeId: item.chargeId, description: item.description, quantity: item.quantity.toFixed(2), unitPrice: item.unitPrice.toFixed(2), total: (item.quantity * item.unitPrice).toFixed(2) })));
      return manager.getRepository(Invoice).findOne({ where: { id: invoice.id }, relations: { patient: true, items: true, payments: true } });
    });
  },
  async addPayment(invoiceId: number, input: PaymentInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const cashPosting = input.method === 'cash' ? await lockCashier(manager, userId) : null;
      const invoice = await manager.getRepository(Invoice).createQueryBuilder('invoice').setLock('pessimistic_write').where('invoice.id = :id', { id: invoiceId }).getOne();
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (invoice.status === 'cancelled') throw new ConflictError('Cancelled invoice cannot receive payments');
      const balance = cents(invoice.balanceAmount);
      const amountCents = cents(input.amount);
      if (amountCents > balance) throw new ValidationError('Payment cannot exceed invoice balance');
      await manager.getRepository(Payment).save(manager.getRepository(Payment).create({ invoiceId, amount: input.amount.toFixed(2), method: input.method, referenceNumber: input.referenceNumber ?? null, paidAt: cashPosting?.postedAt ?? new Date(), createdById: userId }));
      const paid = cents(invoice.paidAmount) + amountCents; const nextBalance = cents(invoice.total) - paid;
      invoice.paidAmount = (paid / 100).toFixed(2); invoice.balanceAmount = (nextBalance / 100).toFixed(2); invoice.status = nextBalance === 0 ? 'paid' : 'partially_paid';
      await manager.getRepository(Invoice).save(invoice);
      return manager.getRepository(Invoice).findOne({ where: { id: invoiceId }, relations: { patient: true, items: true, payments: true } });
    });
  },
  async addRefund(invoiceId: number, input: RefundInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const cashPosting = input.method === 'cash' ? await lockCashier(manager, userId) : null;
      const invoiceRepo = manager.getRepository(Invoice);
      const invoice = await invoiceRepo.createQueryBuilder('invoice').setLock('pessimistic_write').where('invoice.id = :id', { id: invoiceId }).getOne();
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (invoice.status === 'cancelled') throw new ConflictError('Cancelled invoice cannot be refunded');
      const payment = await manager.getRepository(Payment).findOne({ where: { id: input.paymentId, invoiceId } });
      if (!payment) throw new NotFoundError('Payment not found on this invoice');
      if (payment.method === 'insurance' && payment.referenceNumber && await manager.getRepository(InsuranceClaim).exist({ where: { invoiceId, claimNumber: payment.referenceNumber, status: 'settled' } })) throw new ConflictError('Settled insurance claim payment cannot be refunded');
      const existing = await manager.getRepository(Refund).find({ where: { paymentId: payment.id } });
      const refundedCents = existing.reduce((sum, refund) => sum + cents(refund.amount), 0);
      const amountCents = cents(input.amount);
      if (amountCents > cents(payment.amount) - refundedCents) throw new ValidationError('Refund exceeds the unrefunded payment amount');
      const refund = await manager.getRepository(Refund).save(manager.getRepository(Refund).create({ invoiceId, paymentId: payment.id, amount: input.amount.toFixed(2), method: input.method, referenceNumber: input.referenceNumber ?? null, reason: input.reason, createdById: userId, ...(cashPosting ? { refundedAt: cashPosting.postedAt } : {}) }));
      const paidCents = cents(invoice.paidAmount) - amountCents;
      const balanceCents = cents(invoice.total) - paidCents;
      invoice.paidAmount = (paidCents / 100).toFixed(2);
      invoice.balanceAmount = (balanceCents / 100).toFixed(2);
      invoice.status = paidCents === 0 ? 'open' : balanceCents === 0 ? 'paid' : 'partially_paid';
      await invoiceRepo.save(invoice);
      return refundResponse(await manager.getRepository(Refund).findOne({ where: { id: refund.id }, relations: { payment: true, createdBy: true } }));
    });
  },
};
