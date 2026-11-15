import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { appointmentController } from '../controllers/appointment.controller.js';
import {
  appointmentIdParamSchema,
  appointmentListQuerySchema,
  appointmentSlotsQuerySchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../validators/appointment.validators.js';
import { z } from 'zod';

const availableDoctorsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  departmentId: z.coerce.number().int().positive().optional(),
});

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('appointments.view'),
  validate(appointmentListQuerySchema, 'query'),
  asyncHandler(appointmentController.list),
);

router.get(
  '/available-doctors',
  authorize('appointments.view'),
  validate(availableDoctorsQuerySchema, 'query'),
  asyncHandler(appointmentController.availableDoctors),
);

router.get(
  '/slots',
  authorize('appointments.view'),
  validate(appointmentSlotsQuerySchema, 'query'),
  asyncHandler(appointmentController.slots),
);

router.get(
  '/:id',
  authorize('appointments.view'),
  validate(appointmentIdParamSchema, 'params'),
  asyncHandler(appointmentController.getById),
);

router.post(
  '/',
  authorize('appointments.create'),
  validate(createAppointmentSchema),
  asyncHandler(appointmentController.create),
);

router.patch(
  '/:id/status',
  authorize('appointments.update'),
  validate(appointmentIdParamSchema, 'params'),
  validate(updateAppointmentStatusSchema),
  asyncHandler(appointmentController.updateStatus),
);

export default router;
