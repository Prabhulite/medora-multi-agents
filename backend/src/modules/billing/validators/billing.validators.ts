import { z } from 'zod';

export const invoiceListQuerySchema = z.object({ patientId: z.coerce.number().int().positive().optional(), status: z.enum(['open', 'partially_paid', 'paid', 'cancelled']).optional() });
export const createInvoiceSchema = z.object({ patientId: z.number().int().positive(), dueDate: z.string().date().nullable().optional(), notes: z.string().trim().max(4000).nullable().optional(), discount: z.number().min(0).default(0), tax: z.number().min(0).default(0), items: z.array(z.object({ chargeId: z.number().int().positive().nullable().optional(), description: z.string().trim().min(2).max(255), quantity: z.number().positive().max(100000), unitPrice: z.number().min(0).max(100000000) })).min(1) });
export const chargeSchema = z.object({ code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/), name: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(60), unitPrice: z.number().min(0).max(100000000).refine((value) => Number.isInteger(Math.round(value * 10000) / 100), 'Price must have at most two decimal places'), isActive: z.boolean().default(true) });
export const updateChargeSchema = chargeSchema.partial();
export const chargeIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export type ChargeInput = z.infer<typeof chargeSchema>;
export type UpdateChargeInput = z.infer<typeof updateChargeSchema>;
const moneyAmount = z.number().positive().max(100000000).refine((value) => Number.isInteger(Math.round(value * 10000) / 100), 'Amount must have at most two decimal places');
export const paymentSchema = z.object({ amount: moneyAmount, method: z.enum(['cash', 'card', 'upi', 'bank_transfer', 'insurance']), referenceNumber: z.string().trim().max(120).nullable().optional() });
export const refundSchema = z.object({ paymentId: z.number().int().positive(), amount: moneyAmount, method: z.enum(['cash', 'card', 'upi', 'bank_transfer']), referenceNumber: z.string().trim().max(120).nullable().optional(), reason: z.string().trim().min(3).max(500) });
export const invoiceIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const claimIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const createClaimSchema = z.object({ invoiceId: z.number().int().positive(), payerName: z.string().trim().min(2).max(160), policyNumber: z.string().trim().min(2).max(120), claimedAmount: moneyAmount, notes: z.string().trim().max(2000).nullable().optional() });
export const claimActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.enum(['submit', 'resubmit']) }),
  z.object({ action: z.literal('approve'), approvedAmount: moneyAmount, decisionNote: z.string().trim().max(2000).nullable().optional() }),
  z.object({ action: z.literal('reject'), decisionNote: z.string().trim().min(2).max(2000) }),
  z.object({ action: z.literal('settle') }),
]);
export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type ClaimActionInput = z.infer<typeof claimActionSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
