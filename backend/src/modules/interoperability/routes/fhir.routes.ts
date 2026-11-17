import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { fhirPatientService } from '../services/fhir-patient.service.js';

const router = Router();
const patientIdSchema = z.object({ id: z.coerce.number().int().positive() });

router.get('/r4/Patient/:id', authenticate, authorize('patients.export'), validate(patientIdSchema, 'params'), asyncHandler(async (req, res) => {
  const resource = await fhirPatientService.read(Number(req.params.id), req.user?.id ?? null);
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).type('application/fhir+json').json(resource);
}));

export default router;
