import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { specializationController } from '../controllers/specialization.controller.js';
import {
  createSpecializationSchema,
  specializationIdParamSchema,
  updateSpecializationSchema,
} from '../validators/specialization.validators.js';

const router = Router();

router.use(authenticate);

router.get(
  '/active',
  authorizeAny('doctors.view', 'doctors.create', 'doctors.update', 'specializations.view'),
  asyncHandler(specializationController.listActive),
);

router.get('/', authorize('specializations.view'), asyncHandler(specializationController.list));

router.get(
  '/:id',
  authorize('specializations.view'),
  validate(specializationIdParamSchema, 'params'),
  asyncHandler(specializationController.getById),
);

router.post(
  '/',
  authorize('specializations.create'),
  validate(createSpecializationSchema),
  asyncHandler(specializationController.create),
);

router.put(
  '/:id',
  authorize('specializations.update'),
  validate(specializationIdParamSchema, 'params'),
  validate(updateSpecializationSchema),
  asyncHandler(specializationController.update),
);

router.delete(
  '/:id',
  authorize('specializations.delete'),
  validate(specializationIdParamSchema, 'params'),
  asyncHandler(specializationController.remove),
);

export default router;
