import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { patientController } from '../controllers/patient.controller.js';
import { communicationParamSchema, completeFollowUpSchema, createCommunicationSchema, followUpQuerySchema } from '../validators/communication.validators.js';
import {
  createPatientSchema,
  duplicateCheckSchema,
  mergePatientSchema,
  patientIdParamSchema,
  patientSearchQuerySchema,
  updatePatientSchema,
  createRegistrationSourceSchema,
  registrationSourceIdParamSchema,
  registrationSourceReportQuerySchema,
  updateRegistrationSourceSchema,
} from '../validators/patient.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('patients.view'), asyncHandler(patientController.list));
router.get('/registration-sources', authorizeAny('patients.view', 'patients.registration_sources.manage'), asyncHandler(patientController.registrationSources));
router.get('/registration-source-report', authorize('patients.registration_sources.manage'), validate(registrationSourceReportQuerySchema, 'query'), asyncHandler(patientController.registrationSourceReport));
router.post('/registration-sources', authorize('patients.registration_sources.manage'), validate(createRegistrationSourceSchema), asyncHandler(patientController.createRegistrationSource));
router.patch('/registration-sources/:sourceId', authorize('patients.registration_sources.manage'), validate(registrationSourceIdParamSchema, 'params'), validate(updateRegistrationSourceSchema), asyncHandler(patientController.updateRegistrationSource));
router.get('/registration-sources/:sourceId/history', authorize('patients.registration_sources.manage'), validate(registrationSourceIdParamSchema, 'params'), asyncHandler(patientController.registrationSourceHistory));

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

router.get('/follow-ups', authorize('patients.view'), validate(followUpQuerySchema, 'query'), asyncHandler(patientController.followUps));
router.post('/:id/communications/:communicationId/complete', authorize('patients.update'), validate(communicationParamSchema, 'params'), validate(completeFollowUpSchema), asyncHandler(patientController.completeFollowUp));

router.get('/:id/communications', authorize('patients.view'), validate(patientIdParamSchema, 'params'), asyncHandler(patientController.communications));
router.post('/:id/communications', authorize('patients.update'), validate(patientIdParamSchema, 'params'), validate(createCommunicationSchema), asyncHandler(patientController.recordCommunication));

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
