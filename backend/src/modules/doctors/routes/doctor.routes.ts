import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { doctorController } from '../controllers/doctor.controller.js';
import {
  createDoctorSchema,
  doctorIdParamSchema,
  updateDoctorSchema,
} from '../validators/doctor.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('doctors.view'), asyncHandler(doctorController.list));

router.get(
  '/:id',
  authorize('doctors.view'),
  validate(doctorIdParamSchema, 'params'),
  asyncHandler(doctorController.getById),
);

router.post(
  '/',
  authorize('doctors.create'),
  validate(createDoctorSchema),
  asyncHandler(doctorController.create),
);

router.put(
  '/:id',
  authorize('doctors.update'),
  validate(doctorIdParamSchema, 'params'),
  validate(updateDoctorSchema),
  asyncHandler(doctorController.update),
);

router.delete(
  '/:id',
  authorize('doctors.delete'),
  validate(doctorIdParamSchema, 'params'),
  asyncHandler(doctorController.remove),
);

export default router;
