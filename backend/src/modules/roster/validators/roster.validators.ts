import { z } from 'zod';

export const shiftListQuerySchema = z.object({ from: z.string().datetime({ offset: true }), to: z.string().datetime({ offset: true }), staffId: z.coerce.number().int().positive().optional() }).refine((value) => new Date(value.to) > new Date(value.from) && new Date(value.to).getTime() - new Date(value.from).getTime() <= 31 * 24 * 60 * 60 * 1000, 'Choose a range of up to 31 days');
export const shiftIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const createShiftSchema = z.object({ staffId: z.number().int().positive(), startsAt: z.string().datetime({ offset: true }), endsAt: z.string().datetime({ offset: true }), location: z.string().trim().min(2).max(120), dutyRole: z.string().trim().min(2).max(120), notes: z.string().trim().max(2000).nullable().optional() }).refine((value) => new Date(value.endsAt) > new Date(value.startsAt) && new Date(value.endsAt).getTime() - new Date(value.startsAt).getTime() <= 24 * 60 * 60 * 1000, 'A shift must have a positive duration of at most 24 hours');
export const closeShiftSchema = z.object({ status: z.enum(['completed', 'cancelled']), closureNote: z.string().trim().min(2).max(2000) });
export type ShiftListQuery = z.infer<typeof shiftListQuerySchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
