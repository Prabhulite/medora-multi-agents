import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { fhirPatientService } from '../services/fhir-patient.service.js';
import { fhirLaboratoryReportService } from '../services/fhir-laboratory-report.service.js';

const router = Router();
const patientIdSchema = z.object({ id: z.coerce.number().int().positive() });
const patientIdentifierSearchSchema = z.object({ identifier: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/) });

router.get('/r4/Patient', authenticate, authorize('patients.export'), validate(patientIdentifierSearchSchema, 'query'), asyncHandler(async (req, res) => {
  const bundle = await fhirPatientService.searchByMrd(String(req.query.identifier), req.user?.id ?? null);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).type('application/fhir+json').json(bundle);
}));
router.get('/r4/Patient/:id', authenticate, authorize('patients.export'), validate(patientIdSchema, 'params'), asyncHandler(async (req, res) => {
  const resource = await fhirPatientService.read(Number(req.params.id), req.user?.id ?? null);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).type('application/fhir+json').json(resource);
}));
router.get('/r4/DiagnosticReport/laboratory/:id', authenticate, authorize('patients.export', 'laboratory.view'), validate(patientIdSchema, 'params'), asyncHandler(async (req, res) => {
  const resource = await fhirLaboratoryReportService.read(Number(req.params.id), req.user?.id ?? null);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).type('application/fhir+json').json(resource);
}));

export default router;
