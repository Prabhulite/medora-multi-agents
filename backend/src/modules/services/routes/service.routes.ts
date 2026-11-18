import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { serviceController } from '../controllers/service.controller.js';
import {
  createServiceSchema,
  serviceIdSchema,
  updateServiceSchema,
} from '../validators/service.validators.js';

const router = Router();
router.use(authenticate);

router.get(
  '/active',
  authorizeAny(
    'services.view',
    'services.create',
    'services.update',
    'billing.view',
    'billing.create',
  ),
  asyncHandler(serviceController.listActive),
);
router.get('/', authorize('services.view'), asyncHandler(serviceController.list));
router.get(
  '/:id',
  authorize('services.view'),
  validate(serviceIdSchema, 'params'),
  asyncHandler(serviceController.getById),
);
router.post(
  '/',
  authorize('services.create'),
  validate(createServiceSchema),
  asyncHandler(serviceController.create),
);
router.put(
  '/:id',
  authorize('services.update'),
  validate(serviceIdSchema, 'params'),
  validate(updateServiceSchema),
  asyncHandler(serviceController.update),
);
router.delete(
  '/:id',
  authorize('services.delete'),
  validate(serviceIdSchema, 'params'),
  asyncHandler(serviceController.remove),
);

export default router;
