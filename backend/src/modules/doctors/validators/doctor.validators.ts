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

const optionalNumber = z
  .union([z.number(), z.nan(), z.null()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || Number.isNaN(value)) return null;
    return value;
  });

const optionalMoney = z
  .union([z.number().nonnegative(), z.nan(), z.null()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || Number.isNaN(value)) return null;
    return value;
  });

const optionalTime = z
  .union([
    z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, 'Invalid time'),
    z.literal(''),
  ])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value.length === 5 ? `${value}:00` : value;
  });

const feeSchema = z
  .object({
    newConsultationFee: optionalMoney,
    followUpConsultationFee: optionalMoney,
    emergencyConsultationFee: optionalMoney,
  })
  .optional();

const scheduleSchema = z
  .object({
    availableDays: z.array(z.number().int().min(0).max(6)).default([]),
    morningStart: optionalTime,
    morningEnd: optionalTime,
    eveningStart: optionalTime,
    eveningEnd: optionalTime,
    breakStart: optionalTime,
    breakEnd: optionalTime,
    maxPatientsPerSession: optionalNumber,
  })
  .optional();

const leaveSchema = z.object({
  leaveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leaveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: optionalText(255),
  status: z.enum(['scheduled', 'cancelled', 'completed']).default('scheduled'),
});

export const createDoctorSchema = z.object({
  name: z.string().trim().min(2).max(160),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  dob: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      return value;
    }),
  mobileNumber: z.string().trim().min(8).max(20),
  email: z
    .union([z.string().trim().email().max(160), z.literal('')])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      return value;
    }),
  address: optionalText(2000),
  photoData: z
    .union([z.string().max(5_000_000), z.literal('')])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      return value;
    }),
  qualification: z.string().trim().min(2).max(160),
  specializationId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  medicalRegistrationNumber: z.string().trim().min(2).max(80),
  experienceYears: optionalNumber,
  designation: z
    .enum(['consultant', 'senior_consultant', 'visiting_consultant'])
    .nullable()
    .optional(),
  reviewValidityDays: optionalNumber,
  consultationDurationMinutes: optionalNumber,
  walkInAllowed: z.boolean().default(true),
  appointmentRequired: z.boolean().default(false),
  consultationRoom: optionalText(80),
  doctorType: z.enum(['in_house', 'visiting']).nullable().optional(),
  joiningDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      return value;
    }),
  isActive: z.boolean().default(true),
  fees: feeSchema,
  schedule: scheduleSchema,
  leaves: z.array(leaveSchema).optional().default([]),
  documents: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(160),
        fileName: z.string().trim().min(1).max(255),
        mimeType: z.string().trim().max(120).nullable().optional(),
        fileData: z.string().min(1).max(8_000_000),
      }),
    )
    .optional(),
});

export const updateDoctorSchema = createDoctorSchema.partial().extend({
  name: z.string().trim().min(2).max(160).optional(),
  mobileNumber: z.string().trim().min(8).max(20).optional(),
  qualification: z.string().trim().min(2).max(160).optional(),
  specializationId: z.number().int().positive().optional(),
  departmentId: z.number().int().positive().optional(),
  medicalRegistrationNumber: z.string().trim().min(2).max(80).optional(),
});

export const doctorIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
