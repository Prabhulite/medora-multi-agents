import { z } from 'zod';

const optionalText = (max: number) => z.union([z.string().trim().max(max), z.literal('')]).nullable().optional().transform((value) => value === '' ? null : value);

export const patientClinicalParamSchema = z.object({ patientId: z.coerce.number().int().positive() });
export const consentParamSchema = patientClinicalParamSchema.extend({ consentId: z.coerce.number().int().positive() });
export const createConsentSchema = z.object({
  consentType: z.enum(['general', 'procedure', 'investigation', 'transfusion', 'anaesthesia', 'other']),
  subject: z.string().trim().min(2).max(255),
  risksExplained: z.string().trim().min(2).max(5000),
  treatingDoctorName: z.string().trim().min(2).max(160).nullable().optional(),
  doctorRegistrationNumber: z.string().trim().min(2).max(80).nullable().optional(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  language: z.string().trim().min(2).max(80),
  signatoryName: z.string().trim().min(2).max(160),
  signatoryRole: z.enum(['patient', 'guardian', 'representative']),
  signedAt: z.string().datetime({ offset: true }),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  fileData: z.string().max(1_500_000),
}).superRefine((value, context) => {
  if (value.consentType !== 'general' && (!value.treatingDoctorName || !value.doctorRegistrationNumber)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['treatingDoctorName'], message: 'Treating doctor and registration number are required for this consent type' });
  }
});
export const revokeConsentSchema = z.object({ reason: z.string().trim().min(2).max(1000) });
export type CreateConsentInput = z.infer<typeof createConsentSchema>;
export const allergyParamSchema = patientClinicalParamSchema.extend({ allergyId: z.coerce.number().int().positive() });
export const medicalHistoryParamSchema = patientClinicalParamSchema.extend({ recordId: z.coerce.number().int().positive() });
export const createMedicalHistorySchema = z.object({
  conditionName: z.string().trim().min(2).max(160),
  diagnosedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value, 'Enter a valid date').nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});
export type CreateMedicalHistoryInput = z.infer<typeof createMedicalHistorySchema>;
export const createAllergySchema = z.object({
  allergen: z.string().trim().min(2).max(160),
  reaction: z.string().trim().max(255).nullable().optional(),
  severity: z.enum(['mild', 'moderate', 'severe', 'unknown']).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
export type CreateAllergyInput = z.infer<typeof createAllergySchema>;
export const createClinicalEncounterSchema = z.object({
  patientId: z.number().int().positive(),
  visitId: z.number().int().positive().nullable().optional(),
  doctorId: z.number().int().positive().nullable().optional(),
  encounterType: z.string().trim().min(2).max(30).default('consultation'),
  complaints: optionalText(5000),
  examination: optionalText(5000),
  assessment: optionalText(5000),
  plan: optionalText(5000),
  diagnosisCode: optionalText(40),
  diagnosisName: optionalText(160),
  diagnosisTermId: z.number().int().positive().nullable().optional(),
  vitals: z.record(z.union([z.string().max(80), z.number(), z.null()])).nullable().optional(),
});
export const clinicalEncounterIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const createEncounterAddendumSchema = z.object({ reason: z.string().trim().min(2).max(255), addendum: z.string().trim().min(2).max(10000) });
export type CreateEncounterAddendumInput = z.infer<typeof createEncounterAddendumSchema>;
export type CreateClinicalEncounterInput = z.infer<typeof createClinicalEncounterSchema>;
export const diagnosisTermQuerySchema = z.object({ search: z.string().trim().max(100).optional() });
export const diagnosisTermParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const createDiagnosisTermSchema = z.object({
  system: z.enum(['local', 'ICD-10', 'ICD-11']),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(160),
  version: z.string().trim().max(40).optional(),
});
export type CreateDiagnosisTermInput = z.infer<typeof createDiagnosisTermSchema>;
