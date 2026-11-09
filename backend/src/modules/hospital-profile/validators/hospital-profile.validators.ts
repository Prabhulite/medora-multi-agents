import { z } from 'zod';

export const hospitalTypes = ['multi_speciality', 'ivf', 'general', 'clinic'] as const;

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

export const upsertHospitalProfileSchema = z.object({
  hospitalName: z.string().trim().min(2).max(160),
  hospitalCode: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Code may only contain letters, numbers, ., _, -'),
  hospitalType: z.enum(hospitalTypes).nullable().optional(),
  registrationNumber: optionalText(80),
  gstNumber: optionalText(40),
  contactNumber: optionalText(30),
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
  country: optionalText(80),
  state: optionalText(80),
  district: optionalText(80),
  city: optionalText(80),
  pincode: optionalText(20),
  logoData: z
    .union([z.string().max(5_000_000), z.literal('')])
    .optional()
    .nullable()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value === '') return null;
      return value;
    }),
  website: optionalText(255),
  timeZone: optionalText(80),
  currency: optionalText(20),
  dateFormat: optionalText(40),
  financialYear: optionalText(40),
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

export type UpsertHospitalProfileInput = z.infer<typeof upsertHospitalProfileSchema>;
