import { z } from 'zod';

export const patientIdParamSchema = z.object({ patientId: z.coerce.number().int().positive() });
export const createPrescriptionSchema = z.object({
  patientId: z.number().int().positive(),
  encounterId: z.number().int().positive().nullable().optional(),
  medicationId: z.number().int().positive().nullable().optional(),
  medicineName: z.string().trim().min(2).max(160),
  dosage: z.string().trim().max(80).nullable().optional(),
  frequency: z.string().trim().max(80).nullable().optional(),
  durationDays: z.number().int().positive().max(3650).nullable().optional(),
  quantityPrescribed: z.number().int().positive().max(1000000).nullable().optional(),
  route: z.string().trim().min(2).max(40).default('oral'),
  instructions: z.string().trim().max(2000).nullable().optional(),
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
