import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { surgeryController } from '../controllers/surgery.controller.js';
import { scheduleSurgerySchema, surgeryActionSchema, surgeryCaseIdSchema, surgeryListSchema } from '../validators/surgery.validators.js';

const router = Router(); router.use(authenticate);
router.get('/rooms', authorize('surgery.view'), asyncHandler(surgeryController.rooms));
router.get('/cases', authorize('surgery.view'), validate(surgeryListSchema, 'query'), asyncHandler(surgeryController.cases));
router.post('/cases', authorize('surgery.create'), validate(scheduleSurgerySchema), asyncHandler(surgeryController.schedule));
router.patch('/cases/:id/action', authorize('surgery.update'), validate(surgeryCaseIdSchema, 'params'), validate(surgeryActionSchema), asyncHandler(surgeryController.action));
export default router;
