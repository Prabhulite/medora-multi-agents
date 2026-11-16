import { In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Invoice, Patient, Payment, Refund } from '../../../database/entities/index.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

const cents = (value: string) => Math.round(Number(value) * 100);
const money = (value: number) => (value / 100).toFixed(2);

interface LedgerEntry {
  type: 'invoice' | 'payment' | 'refund';
  id: number;
  invoiceId: number;
  invoiceNumber: string;
  occurredAt: Date;
  description: string;
  debit: string;
  credit: string;
  balance: string;
}

export const patientLedgerService = {
  async get(patientId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    const invoices = await AppDataSource.getRepository(Invoice).find({ where: { patientId }, order: { createdAt: 'ASC', id: 'ASC' } });
    const invoiceIds = invoices.map((invoice) => invoice.id);
    const [payments, refunds] = invoiceIds.length ? await Promise.all([
      AppDataSource.getRepository(Payment).find({ where: { invoiceId: In(invoiceIds) } }),
      AppDataSource.getRepository(Refund).find({ where: { invoiceId: In(invoiceIds) } }),
    ]) : [[], []];
    const invoiceNumbers = new Map(invoices.map((invoice) => [invoice.id, invoice.invoiceNumber]));
    const entries: LedgerEntry[] = [];
    for (const invoice of invoices) entries.push({ type: 'invoice', id: invoice.id, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, occurredAt: invoice.createdAt, description: 'Invoice issued', debit: invoice.total, credit: '0.00', balance: '0.00' });
    for (const payment of payments) entries.push({ type: 'payment', id: payment.id, invoiceId: payment.invoiceId, invoiceNumber: invoiceNumbers.get(payment.invoiceId)!, occurredAt: payment.paidAt, description: `Payment · ${payment.method}${payment.referenceNumber ? ` · ${payment.referenceNumber}` : ''}`, debit: '0.00', credit: payment.amount, balance: '0.00' });
    for (const refund of refunds) entries.push({ type: 'refund', id: refund.id, invoiceId: refund.invoiceId, invoiceNumber: invoiceNumbers.get(refund.invoiceId)!, occurredAt: refund.refundedAt, description: `Refund · ${refund.reason}`, debit: refund.amount, credit: '0.00', balance: '0.00' });
    const order = { invoice: 0, payment: 1, refund: 2 };
    entries.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || order[a.type] - order[b.type] || a.id - b.id);
    let balance = 0;
    for (const entry of entries) { balance += cents(entry.debit) - cents(entry.credit); entry.balance = money(balance); }
    const billed = invoices.reduce((sum, invoice) => sum + cents(invoice.total), 0);
    const collected = payments.reduce((sum, payment) => sum + cents(payment.amount), 0) - refunds.reduce((sum, refund) => sum + cents(refund.amount), 0);
    return { patient: { id: patient.id, fullName: [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' '), mrdNumber: patient.mrdNumber }, summary: { billed: money(billed), collected: money(collected), outstanding: money(balance) }, entries };
  },
};
