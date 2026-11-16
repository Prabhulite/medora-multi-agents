import { z } from 'zod';

export const createCommunicationSchema = z.object({
  channel: z.enum(['phone', 'sms', 'email', 'in_person', 'other']),
  direction: z.enum(['outbound', 'inbound']),
  subject: z.string().trim().min(2).max(160),
  summary: z.string().trim().min(2).max(5000),
  occurredAt: z.string().datetime({ offset: true }),
  followUpDueAt: z.string().datetime({ offset: true }).nullable().optional(),
}).superRefine((value, context) => {
  if (Date.parse(value.occurredAt) > Date.now() + 5 * 60_000) context.addIssue({ code: z.ZodIssueCode.custom, path: ['occurredAt'], message: 'Contact time cannot be in the future' });
  if (value.followUpDueAt && Date.parse(value.followUpDueAt) < Date.parse(value.occurredAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['followUpDueAt'], message: 'Follow-up must be after the contact time' });
});
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
export const communicationParamSchema = z.object({ id: z.coerce.number().int().positive(), communicationId: z.coerce.number().int().positive() });
export const followUpQuerySchema = z.object({ status: z.enum(['open', 'overdue']).default('open') });
export const completeFollowUpSchema = z.object({ note: z.string().trim().min(2).max(1000) });
