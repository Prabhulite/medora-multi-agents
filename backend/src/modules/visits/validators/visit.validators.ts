import { z } from 'zod';

export const visitIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const visitListSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  doctorId: z.coerce.number().int().positive().optional(),
  status: z.enum(['inside', 'done', 'all']).optional(),
  patientId: z.coerce.number().int().positive().optional(),
});

export const createOpCheckinSchema = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  natureOfVisit: z.string().trim().min(2).max(60),
  purposeOfVisit: z.string().trim().min(2).max(255),
  referredBy: z.string().trim().max(120).nullable().optional(),
  appointmentId: z.number().int().positive().nullable().optional(),
  isMlc: z.boolean().optional().default(false),
  hadFood: z.boolean().optional().default(false),
  makeNewCheckin: z.boolean().optional().default(true),
  familyId: z.string().trim().max(40).nullable().optional(),
});

export type VisitListFilters = z.infer<typeof visitListSchema>;
export type CreateOpCheckinInput = z.infer<typeof createOpCheckinSchema>;
