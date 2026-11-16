import { AppDataSource } from '../../../config/data-source.js';
import { InsuranceClaim, Invoice, Payment, Refund } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { ClaimActionInput, CreateClaimInput } from '../validators/billing.validators.js';

const cents = (value: number | string) => Math.round(Number(value) * 100);
function response(claim: InsuranceClaim) {
  const { createdBy, updatedBy, ...fields } = claim;
  return { ...fields, createdBy: createdBy ? { fullName: createdBy.fullName } : null, updatedBy: updatedBy ? { fullName: updatedBy.fullName } : null };
}

export const insuranceClaimService = {
  async list(invoiceId?: number) {
    return (await AppDataSource.getRepository(InsuranceClaim).find({ where: invoiceId ? { invoiceId } : {}, relations: { createdBy: true, updatedBy: true }, order: { createdAt: 'DESC' } })).map(response);
  },
  async create(input: CreateClaimInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const invoice = await manager.getRepository(Invoice).createQueryBuilder('invoice').setLock('pessimistic_write').where('invoice.id = :id', { id: input.invoiceId }).getOne();
      if (!invoice) throw new NotFoundError('Invoice not found');
      if (invoice.status === 'cancelled') throw new ConflictError('Cancelled invoice cannot have a claim');
      if (await manager.getRepository(InsuranceClaim).exist({ where: { invoiceId: input.invoiceId } })) throw new ConflictError('Invoice already has an insurance claim');
      if (cents(input.claimedAmount) > cents(invoice.balanceAmount)) throw new ValidationError('Claimed amount exceeds invoice balance');
      const claim = await manager.getRepository(InsuranceClaim).save(manager.getRepository(InsuranceClaim).create({ invoiceId: invoice.id, claimNumber: await nextSequenceNumber(manager, 'CLM', 'CLM', 6), payerName: input.payerName, policyNumber: input.policyNumber, claimedAmount: input.claimedAmount.toFixed(2), notes: input.notes ?? null, createdById: userId, updatedById: userId }));
      return response((await manager.getRepository(InsuranceClaim).findOne({ where: { id: claim.id }, relations: { createdBy: true, updatedBy: true } }))!);
    });
  },
  async action(id: number, input: ClaimActionInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const lookup = await manager.getRepository(InsuranceClaim).findOne({ where: { id } });
      if (!lookup) throw new NotFoundError('Insurance claim not found');
      const invoice = await manager.getRepository(Invoice).createQueryBuilder('invoice').setLock('pessimistic_write').where('invoice.id = :id', { id: lookup.invoiceId }).getOne();
      if (!invoice) throw new NotFoundError('Invoice not found');
      const claim = await manager.getRepository(InsuranceClaim).createQueryBuilder('claim').setLock('pessimistic_write').where('claim.id = :id', { id }).getOne();
      if (!claim) throw new NotFoundError('Insurance claim not found');
      if (input.action === 'submit' || input.action === 'resubmit') {
        if (input.action === 'submit' && claim.status !== 'draft') throw new ConflictError('Only draft claims can be submitted');
        if (input.action === 'resubmit' && claim.status !== 'rejected') throw new ConflictError('Only rejected claims can be resubmitted');
        if (invoice.status === 'cancelled' || cents(claim.claimedAmount) > cents(invoice.balanceAmount)) throw new ConflictError('Invoice balance no longer covers this claim');
        claim.status = 'submitted'; claim.submittedAt = new Date(); claim.decidedAt = null; claim.decisionNote = null;
      } else if (input.action === 'approve') {
        if (claim.status !== 'submitted') throw new ConflictError('Only submitted claims can be approved');
        if (cents(input.approvedAmount) > cents(claim.claimedAmount)) throw new ValidationError('Approved amount exceeds claimed amount');
        claim.status = 'approved'; claim.approvedAmount = input.approvedAmount.toFixed(2); claim.decisionNote = input.decisionNote ?? null; claim.decidedAt = new Date();
      } else if (input.action === 'reject') {
        if (claim.status !== 'submitted') throw new ConflictError('Only submitted claims can be rejected');
        claim.status = 'rejected'; claim.decisionNote = input.decisionNote; claim.decidedAt = new Date();
      } else {
        if (claim.status !== 'approved') throw new ConflictError('Only approved claims can be settled');
        const payments = await manager.getRepository(Payment).find({ where: { invoiceId: claim.invoiceId, method: 'insurance', referenceNumber: claim.claimNumber } });
        const refunds = payments.length ? await manager.getRepository(Refund).createQueryBuilder('refund').where('refund.payment_id IN (:...paymentIds)', { paymentIds: payments.map((payment) => payment.id) }).getMany() : [];
        const received = payments.reduce((sum, payment) => sum + cents(payment.amount), 0) - refunds.reduce((sum, refund) => sum + cents(refund.amount), 0);
        if (received < cents(claim.approvedAmount!)) throw new ConflictError(`Record insurance payment with reference ${claim.claimNumber} before settling`);
        claim.status = 'settled'; claim.settledAt = new Date();
      }
      claim.updatedById = userId;
      await manager.getRepository(InsuranceClaim).save(claim);
      return response((await manager.getRepository(InsuranceClaim).findOne({ where: { id }, relations: { createdBy: true, updatedBy: true } }))!);
    });
  },
};
