import { z } from 'zod';

export const emergencyIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const emergencyListSchema = z.object({ status: z.enum(['waiting', 'in_care', 'admitted', 'discharged']).optional(), patientId: z.coerce.number().int().positive().optional() });
export const createEmergencyCaseSchema = z.object({
  patientId: z.number().int().positive(), triageCategory: z.enum(['red', 'yellow', 'green']), chiefComplaint: z.string().trim().min(2).max(1000),
  pulseBpm: z.number().int().min(20).max(250).nullable().optional(), systolicBp: z.number().int().min(40).max(300).nullable().optional(),
  diastolicBp: z.number().int().min(20).max(200).nullable().optional(), spo2Percent: z.number().int().min(0).max(100).nullable().optional(),
});
export const updateEmergencyStatusSchema = z.object({ status: z.enum(['in_care', 'admitted', 'discharged']), dispositionNote: z.string().trim().max(2000).nullable().optional() }).superRefine((value, context) => {
  if (value.status !== 'in_care' && !value.dispositionNote) context.addIssue({ code: z.ZodIssueCode.custom, path: ['dispositionNote'], message: 'Disposition note is required' });
});
export type CreateEmergencyCaseInput = z.infer<typeof createEmergencyCaseSchema>;
export type UpdateEmergencyStatusInput = z.infer<typeof updateEmergencyStatusSchema>;
