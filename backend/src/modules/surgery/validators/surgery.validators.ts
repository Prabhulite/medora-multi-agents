import { z } from 'zod';

export const surgeryCaseIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const surgeryListSchema = z.object({ status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(), patientId: z.coerce.number().int().positive().optional() });
export const scheduleSurgerySchema = z.object({ patientId: z.number().int().positive(), surgeonId: z.number().int().positive(), roomId: z.number().int().positive(), procedure: z.string().trim().min(3).max(255), plannedStart: z.string().datetime({ offset: true }), plannedEnd: z.string().datetime({ offset: true }) }).refine((value) => new Date(value.plannedEnd).getTime() > new Date(value.plannedStart).getTime(), { path: ['plannedEnd'], message: 'End must be after start' });
export const surgeryActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }),
  z.object({ action: z.literal('complete'), outcomeNote: z.string().trim().min(3).max(10000) }),
  z.object({ action: z.literal('cancel'), reason: z.string().trim().min(3).max(1000) }),
]);
export type ScheduleSurgeryInput = z.infer<typeof scheduleSurgerySchema>;
export type SurgeryActionInput = z.infer<typeof surgeryActionSchema>;
