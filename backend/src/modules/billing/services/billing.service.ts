import { AppDataSource } from '../../../config/data-source.js';
import { ChargeMaster, InsuranceClaim, Invoice, InvoiceItem, Patient, Payment, Refund } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateInvoiceInput, PaymentInput, RefundInput } from '../validators/billing.validators.js';

const cents = (value: number | string) => Math.round(Number(value) * 100);
const refundResponse = (row: Refund | null) => row ? { ...row, createdBy: row.createdBy ? { id: row.createdBy.id, fullName: row.createdBy.fullName } : null } : null;

export const billingService = {
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
      const invoice = await manager.getRepository(Invoice).createQueryBuilder('invoice').setLock('pessimistic_write').where('invoice.id = :id', { id: invoiceId }).getOne();
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (invoice.status === 'cancelled') throw new ConflictError('Cancelled invoice cannot receive payments');
      const balance = cents(invoice.balanceAmount);
      const amountCents = cents(input.amount);
      if (amountCents > balance) throw new ValidationError('Payment cannot exceed invoice balance');
      await manager.getRepository(Payment).save(manager.getRepository(Payment).create({ invoiceId, amount: input.amount.toFixed(2), method: input.method, referenceNumber: input.referenceNumber ?? null, paidAt: new Date(), createdById: userId }));
      const paid = cents(invoice.paidAmount) + amountCents; const nextBalance = cents(invoice.total) - paid;
      invoice.paidAmount = (paid / 100).toFixed(2); invoice.balanceAmount = (nextBalance / 100).toFixed(2); invoice.status = nextBalance === 0 ? 'paid' : 'partially_paid';
      await manager.getRepository(Invoice).save(invoice);
      return manager.getRepository(Invoice).findOne({ where: { id: invoiceId }, relations: { patient: true, items: true, payments: true } });
    });
  },
  async addRefund(invoiceId: number, input: RefundInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
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
      const refund = await manager.getRepository(Refund).save(manager.getRepository(Refund).create({ invoiceId, paymentId: payment.id, amount: input.amount.toFixed(2), method: input.method, referenceNumber: input.referenceNumber ?? null, reason: input.reason, createdById: userId }));
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
