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

const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s()]{8,20}$/, 'Invalid phone number');

const optionalPhone = z
  .union([phoneSchema, z.literal('')])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value;
  });

const dateSchema = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal('')])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return value;
  });

const idProofDocumentSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    fileName: z.string().trim().min(1).max(255),
    mimeType: optionalText(120),
    fileData: z.string().min(1),
  })
  .nullable()
  .optional();

const contactSchema = z.object({
  mobileNumber: phoneSchema,
  alternateMobile: optionalPhone,
  email: z
    .union([z.string().trim().email().max(160), z.literal('')])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      return value;
    }),
});

const addressSchema = z.object({
  addressLine1: z.string().trim().min(2).max(255),
  addressLine2: optionalText(255),
  country: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  city: z.string().trim().min(1).max(80),
  pincode: z.string().trim().regex(/^[0-9]{4,12}$/, 'Invalid pincode'),
});

const identificationSchema = z
  .object({
    idProofType: z
      .enum(['aadhaar', 'passport', 'voter_id', 'driving_licence', 'other'])
      .nullable()
      .optional(),
    idProofNumber: optionalText(80),
    idProofDocument: idProofDocumentSchema,
    abhaNumber: optionalText(40),
    abhaAddress: optionalText(120),
  })
  .superRefine((value, ctx) => {
    if (value.idProofType === 'aadhaar' && value.idProofNumber) {
      const digits = value.idProofNumber.replace(/\D/g, '');
      if (digits.length !== 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['idProofNumber'],
          message: 'Aadhaar number must be 12 digits',
        });
      }
    }
  });

const emergencySchema = z
  .object({
    contactPersonName: optionalText(120),
    relationship: z
      .enum([
        'father',
        'mother',
        'husband',
        'wife',
        'son',
        'daughter',
        'brother',
        'sister',
        'guardian',
        'other',
      ])
      .nullable()
      .optional(),
    contactNumber: optionalPhone,
    alternateNumber: optionalPhone,
    address: optionalText(500),
  })
  .optional()
  .nullable();

const patientBaseObjectSchema = z.object({
  title: optionalText(20),
  firstName: z.string().trim().min(1).max(80),
  middleName: optionalText(80),
  lastName: optionalText(80),
  gender: z.enum(['male', 'female', 'transgender', 'other']),
  dateOfBirth: dateSchema,
  ageYears: z.number().int().min(0).max(150).nullable().optional(),
  ageIsApproximate: z.boolean().optional(),
  bloodGroup: optionalText(10),
  maritalStatus: optionalText(30),
  nationality: optionalText(80),
  religion: optionalText(80),
  photoData: optionalText(5_000_000),
  occupation: optionalText(80),
  patientCategory: z
    .enum(['general', 'corporate', 'insurance', 'government_scheme', 'staff', 'vip'])
    .nullable()
    .optional(),
  referredBy: optionalText(120),
  referralDoctorId: z.number().int().positive().nullable().optional(),
  preferredLanguage: optionalText(60),
  specialRemarks: optionalText(2000),
  contact: contactSchema,
  address: addressSchema,
  identification: identificationSchema.optional().nullable(),
  emergencyContact: emergencySchema,
  isActive: z.boolean().optional(),
  createVisit: z.boolean().optional(),
});

export const createPatientSchema = patientBaseObjectSchema.superRefine((value, ctx) => {
  if (!value.dateOfBirth && (value.ageYears == null || Number.isNaN(value.ageYears))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateOfBirth'],
      message: 'Date of birth or approximate age is required',
    });
  }
});

export const updatePatientSchema = patientBaseObjectSchema.partial().extend({
  firstName: z.string().trim().min(1).max(80).optional(),
  gender: z.enum(['male', 'female', 'transgender', 'other']).optional(),
  contact: contactSchema.optional(),
  address: addressSchema.optional(),
});

export const patientIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const patientSearchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  mrdNumber: z.string().trim().max(40).optional(),
  mobileNumber: z.string().trim().max(20).optional(),
  visitNumber: z.string().trim().max(40).optional(),
  includeInactive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
});

export const duplicateCheckSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: optionalText(80),
  mobileNumber: phoneSchema,
  dateOfBirth: dateSchema,
  idProofType: z
    .enum(['aadhaar', 'passport', 'voter_id', 'driving_licence', 'other'])
    .nullable()
    .optional(),
  idProofNumber: optionalText(80),
  excludePatientId: z.number().int().positive().optional(),
});

export const mergePatientSchema = z.object({
  sourcePatientId: z.number().int().positive(),
  targetPatientId: z.number().int().positive(),
}).refine((value) => value.sourcePatientId !== value.targetPatientId, {
  message: 'Source and target patients must be different',
  path: ['sourcePatientId'],
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
export type MergePatientInput = z.infer<typeof mergePatientSchema>;
