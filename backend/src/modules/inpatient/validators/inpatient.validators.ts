import { z } from 'zod';

export const admissionIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const carePlanIdParamSchema = admissionIdParamSchema.extend({ planId: z.coerce.number().int().positive() });
export const dueCarePlanQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10) });
export const pendingHandoffQuerySchema = dueCarePlanQuerySchema;
export const createCarePlanSchema = z.object({ problem: z.string().trim().min(2).max(500), goal: z.string().trim().min(2).max(1000), interventions: z.string().trim().min(2).max(10000), reviewAt: z.string().datetime({ offset: true }).nullable().optional() });
export const closeCarePlanSchema = z.object({ status: z.enum(['completed', 'discontinued']), reviewNote: z.string().trim().min(2).max(2000) });
export const continueCarePlanSchema = z.object({ reviewNote: z.string().trim().min(2).max(2000), nextReviewAt: z.string().datetime({ offset: true }) });
export const nursingHandoffIdParamSchema = admissionIdParamSchema.extend({ handoffId: z.coerce.number().int().positive() });
export const createNursingHandoffSchema = z.object({ conditionSummary: z.string().trim().min(2).max(5000), pendingTasks: z.string().trim().min(2).max(5000), safetyConcerns: z.string().trim().max(5000).nullable().optional() });
export const transferBedSchema = z.object({ toBedId: z.number().int().positive(), reason: z.string().trim().min(2).max(500) });
export const medicationAdministrationSchema = z.object({ prescriptionId: z.number().int().positive(), outcome: z.enum(['given', 'withheld', 'refused']), doseGiven: z.string().trim().max(80).nullable().optional(), route: z.string().trim().max(40).nullable().optional(), notes: z.string().trim().max(1000).nullable().optional() }).superRefine((value, context) => {
  if (value.outcome === 'given' && !value.doseGiven) context.addIssue({ code: z.ZodIssueCode.custom, path: ['doseGiven'], message: 'Dose is required when medication is given' });
  if (value.outcome !== 'given' && !value.notes) context.addIssue({ code: z.ZodIssueCode.custom, path: ['notes'], message: 'Reason is required when medication is not given' });
});
const medicationDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ prescriptionId: z.number().int().positive(), decision: z.literal('continue'), instructions: z.string().trim().min(2).max(1000) }),
  z.object({ prescriptionId: z.number().int().positive(), decision: z.literal('stop'), reason: z.string().trim().min(5).max(1000) }),
]);
const homeMedicationDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ homeMedicationId: z.number().int().positive(), decision: z.literal('continue'), instructions: z.string().trim().min(2).max(1000), changeReason: z.string().trim().min(5).max(1000).optional() }),
  z.object({ homeMedicationId: z.number().int().positive(), decision: z.literal('stop'), reason: z.string().trim().min(5).max(1000) }),
]);
export const dischargeSummarySchema = z.object({ dischargeSummary: z.string().trim().min(2).max(10000), dischargeDiagnosis: z.string().trim().max(5000).nullable().optional(), dischargeMedications: z.string().trim().max(5000).nullable().optional(), followUpInstructions: z.string().trim().max(5000).nullable().optional(), medicationsReviewed: z.literal(true), medicationReview: z.array(medicationDecisionSchema).max(500), homeMedicationsReviewed: z.literal(true), homeMedicationReview: z.array(homeMedicationDecisionSchema).max(500) });
const admissionHomeMedicationDecisionSchema = z.discriminatedUnion('decision', [
  z.object({ homeMedicationId: z.number().int().positive(), decision: z.literal('continue') }),
  z.object({ homeMedicationId: z.number().int().positive(), decision: z.literal('hold'), reason: z.string().trim().min(5).max(1000) }),
  z.object({ homeMedicationId: z.number().int().positive(), decision: z.literal('stop'), reason: z.string().trim().min(5).max(1000) }),
]);
export const admissionMedicationReviewSchema = z.object({ homeMedicationsReviewed: z.literal(true), homeMedicationReview: z.array(admissionHomeMedicationDecisionSchema).max(500) });
export const nursingObservationSchema = z.object({ temperatureC: z.number().min(25).max(45).nullable().optional(), pulseBpm: z.number().int().min(20).max(250).nullable().optional(), systolicBp: z.number().int().min(40).max(300).nullable().optional(), diastolicBp: z.number().int().min(20).max(200).nullable().optional(), spo2Percent: z.number().int().min(0).max(100).nullable().optional(), notes: z.string().trim().max(4000).nullable().optional() }).refine((value) => Object.values(value).some((item) => item !== null && item !== undefined && item !== ''), 'Record at least one observation');
export const createAdmissionSchema = z.object({
  patientId: z.number().int().positive(), bedId: z.number().int().positive(),
  doctorId: z.number().int().positive().nullable().optional(), departmentId: z.number().int().positive().nullable().optional(),
  reason: z.string().trim().max(255).nullable().optional(), notes: z.string().trim().max(4000).nullable().optional(),
});
export const admissionListQuerySchema = z.object({ status: z.enum(['admitted', 'transferred', 'discharged']).optional(), patientId: z.coerce.number().int().positive().optional() });
export const createWardSchema = z.object({ code: z.string().trim().min(2).max(40), name: z.string().trim().min(2).max(120), wardType: z.string().trim().min(2).max(40).default('general'), floor: z.number().int().min(0).max(200).default(0) });
export type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;
