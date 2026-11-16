import { z } from 'zod';
const positiveInt = z.number().int().positive();
export const radiologyOrderListSchema = z.object({ patientId: z.coerce.number().int().positive().optional(), status: z.enum(['ordered', 'scheduled', 'performed', 'reported', 'cancelled']).optional() });
export const createRadiologyOrderSchema = z.object({ patientId: positiveInt, modalityId: positiveInt, doctorId: positiveInt.nullable().optional(), priority: z.enum(['routine', 'urgent', 'stat']).default('routine'), clinicalNotes: z.string().trim().max(5000).nullable().optional() });
export const updateRadiologyReportSchema = z.object({ status: z.enum(['performed', 'reported']), reportText: z.string().trim().max(10000).nullable().optional(), impression: z.string().trim().max(5000).nullable().optional() });
export const radiologyOrderIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export type CreateRadiologyOrderInput = z.infer<typeof createRadiologyOrderSchema>;
export type UpdateRadiologyReportInput = z.infer<typeof updateRadiologyReportSchema>;
