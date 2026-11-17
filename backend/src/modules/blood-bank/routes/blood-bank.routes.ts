import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { bloodBankController } from '../controllers/blood-bank.controller.js';
import { discardUnitSchema, issueUnitSchema, patientLookupSchema, receiveUnitSchema, releaseUnitSchema, unitIdSchema, unitListSchema } from '../validators/blood-bank.validators.js';

const router = Router();
router.use(authenticate);
router.get('/units', authorize('blood_bank.view'), validate(unitListSchema, 'query'), asyncHandler(bloodBankController.list));
router.get('/patients', authorize('blood_bank.issue'), validate(patientLookupSchema, 'query'), asyncHandler(bloodBankController.patients));
router.get('/units/:id/events', authorize('blood_bank.view'), validate(unitIdSchema, 'params'), asyncHandler(bloodBankController.events));
router.post('/units', authorize('blood_bank.manage'), validate(receiveUnitSchema), asyncHandler(bloodBankController.receive));
router.post('/units/:id/release', authorize('blood_bank.manage'), validate(unitIdSchema, 'params'), validate(releaseUnitSchema), asyncHandler(bloodBankController.release));
router.post('/units/:id/issue', authorize('blood_bank.issue'), validate(unitIdSchema, 'params'), validate(issueUnitSchema), asyncHandler(bloodBankController.issue));
router.post('/units/:id/discard', authorize('blood_bank.manage'), validate(unitIdSchema, 'params'), validate(discardUnitSchema), asyncHandler(bloodBankController.discard));
export default router;
