import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { emergencyController } from '../controllers/emergency.controller.js';
import { createEmergencyCaseSchema, emergencyIdSchema, emergencyListSchema, updateEmergencyStatusSchema } from '../validators/emergency.validators.js';

const router = Router(); router.use(authenticate);
router.get('/cases', authorize('emergency.view'), validate(emergencyListSchema, 'query'), asyncHandler(emergencyController.list));
router.post('/cases', authorize('emergency.create'), validate(createEmergencyCaseSchema), asyncHandler(emergencyController.create));
router.patch('/cases/:id/status', authorize('emergency.update'), validate(emergencyIdSchema, 'params'), validate(updateEmergencyStatusSchema), asyncHandler(emergencyController.updateStatus));
export default router;
