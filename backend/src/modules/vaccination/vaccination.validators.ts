import { z } from 'zod';

export const idSchema = z.object({ id: z.coerce.number().int().positive() });
export const catalogSchema = z.object({ code: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(160) });
export const recordSchema = z.object({
  patientId: z.number().int().positive(), vaccineId: z.number().int().positive(),
  doseNumber: z.number().int().min(1).max(100), administeredOn: z.iso.date(),
  nextDueOn: z.iso.date().nullable().optional(), lotNumber: z.string().trim().max(120).nullable().optional(),
  remarks: z.string().trim().max(500).nullable().optional(),
}).refine((value) => !value.nextDueOn || value.nextDueOn >= value.administeredOn, { path: ['nextDueOn'], message: 'Due date must be on or after administration' });
export const reportSchema = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional(), vaccineId: z.coerce.number().int().positive().optional() }).refine((v) => !v.from || !v.to || v.from <= v.to, 'From date must be before to date');
