import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { patientController } from '../controllers/patient.controller.js';
import {
  createPatientSchema,
  duplicateCheckSchema,
  mergePatientSchema,
  patientIdParamSchema,
  patientSearchQuerySchema,
  updatePatientSchema,
} from '../validators/patient.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('patients.view'), asyncHandler(patientController.list));

router.get(
  '/search',
  authorize('patients.view'),
  validate(patientSearchQuerySchema, 'query'),
  asyncHandler(patientController.search),
);

router.post(
  '/duplicates',
  authorize('patients.view'),
  validate(duplicateCheckSchema),
  asyncHandler(patientController.checkDuplicates),
);

router.post(
  '/merge',
  authorize('patients.merge'),
  validate(mergePatientSchema),
  asyncHandler(patientController.merge),
);

router.get(
  '/:id/audit-logs',
  authorize('patients.view'),
  validate(patientIdParamSchema, 'params'),
  asyncHandler(patientController.auditLogs),
);

router.get(
  '/:id',
  authorize('patients.view'),
  validate(patientIdParamSchema, 'params'),
  asyncHandler(patientController.getById),
);

router.post(
  '/',
  authorize('patients.create'),
  validate(createPatientSchema),
  asyncHandler(patientController.create),
);

router.put(
  '/:id',
  authorize('patients.update'),
  validate(patientIdParamSchema, 'params'),
  validate(updatePatientSchema),
  asyncHandler(patientController.update),
);

router.delete(
  '/:id',
  authorize('patients.delete'),
  validate(patientIdParamSchema, 'params'),
  asyncHandler(patientController.remove),
);

export default router;
