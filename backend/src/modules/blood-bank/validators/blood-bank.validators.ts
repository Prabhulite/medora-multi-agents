import { z } from 'zod';

const date = z.string().refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value, 'Enter a real calendar date');
export const unitIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const unitListSchema = z.object({ status: z.enum(['quarantined', 'available', 'issued', 'discarded']).optional(), search: z.string().trim().max(80).optional(), beforeId: z.coerce.number().int().positive().optional() });
export const patientLookupSchema = z.object({ search: z.string().trim().min(2).max(80) });
export const receiveUnitSchema = z.object({
  unitNumber: z.string().trim().min(2).max(80),
  component: z.string().trim().min(2).max(40),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  collectedOn: date,
  expiresOn: date,
  storageLocation: z.string().trim().min(2).max(120),
}).refine((v) => v.expiresOn > v.collectedOn, 'Expiry must follow collection');
export const releaseUnitSchema = z.object({ screeningReference: z.string().trim().min(2).max(120), screeningCleared: z.literal(true) });
export const issueUnitSchema = z.object({ patientId: z.number().int().positive(), crossmatchReference: z.string().trim().min(2).max(120) });
export const discardUnitSchema = z.object({ reason: z.string().trim().min(5).max(200) });
export type ReceiveUnitInput = z.infer<typeof receiveUnitSchema>;
export type ReleaseUnitInput = z.infer<typeof releaseUnitSchema>;
export type IssueUnitInput = z.infer<typeof issueUnitSchema>;
export type DiscardUnitInput = z.infer<typeof discardUnitSchema>;
export type UnitListQuery = z.infer<typeof unitListSchema>;
