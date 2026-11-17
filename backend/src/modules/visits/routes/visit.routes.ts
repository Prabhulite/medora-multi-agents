import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { visitController } from '../controllers/visit.controller.js';
import {
  createOpCheckinSchema,
  visitIdSchema,
  visitListSchema,
} from '../validators/visit.validators.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  authorize('visits.view'),
  validate(visitListSchema, 'query'),
  asyncHandler(visitController.list),
);

router.get(
  '/patients/:patientId/appointments',
  authorize('visits.checkin'),
  validate(z.object({ patientId: z.coerce.number().int().positive() }), 'params'),
  asyncHandler(visitController.patientAppointments),
);

router.post(
  '/checkin',
  authorize('visits.checkin'),
  validate(createOpCheckinSchema),
  asyncHandler(visitController.checkin),
);

router.patch(
  '/:id/checkout',
  authorize('visits.checkout'),
  validate(visitIdSchema, 'params'),
  asyncHandler(visitController.checkout),
);

export default router;
