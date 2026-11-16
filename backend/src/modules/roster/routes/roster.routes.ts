import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { rosterController } from '../controllers/roster.controller.js';
import { closeShiftSchema, createShiftSchema, shiftIdParamSchema, shiftListQuerySchema } from '../validators/roster.validators.js';

const router = Router(); router.use(authenticate);
router.get('/staff', authorize('roster.view'), asyncHandler(rosterController.staff));
router.get('/shifts', authorize('roster.view'), validate(shiftListQuerySchema, 'query'), asyncHandler(rosterController.shifts));
router.post('/shifts', authorize('roster.manage'), validate(createShiftSchema), asyncHandler(rosterController.create));
router.patch('/shifts/:id/close', authorize('roster.manage'), validate(shiftIdParamSchema, 'params'), validate(closeShiftSchema), asyncHandler(rosterController.close));
export default router;
