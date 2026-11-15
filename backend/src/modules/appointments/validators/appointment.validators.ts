import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal('')])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      return value;
    });

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date');
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Invalid time')
  .transform((value) => (value.length === 5 ? `${value}:00` : value));

export const appointmentStatuses = [
  'booked',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
] as const;

export const createAppointmentSchema = z.object({
  patientId: z.number().int().positive(),
  doctorId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  appointmentDate: dateSchema,
  appointmentTime: timeSchema,
  appointmentType: z.enum(['new_consultation', 'follow_up', 'review']),
  reason: optionalText(255),
  remarks: optionalText(2000),
  forceDuplicate: z.boolean().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(appointmentStatuses),
  notes: optionalText(255),
  appointmentDate: dateSchema.optional(),
  appointmentTime: timeSchema.optional(),
  doctorId: z.number().int().positive().optional(),
  departmentId: z.number().int().positive().optional(),
});

export const appointmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const appointmentSlotsQuerySchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  date: dateSchema,
  excludeAppointmentId: z.coerce.number().int().positive().optional(),
});

export const appointmentListQuerySchema = z.object({
  date: dateSchema.optional(),
  doctorId: z.coerce.number().int().positive().optional(),
  patientId: z.coerce.number().int().positive().optional(),
  status: z.enum(appointmentStatuses).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
