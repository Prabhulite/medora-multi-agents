import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { serviceCategoryController } from '../controllers/service-category.controller.js';
import {
  createServiceCategorySchema,
  serviceCategoryIdSchema,
  updateServiceCategorySchema,
} from '../validators/service-category.validators.js';

const router = Router();
router.use(authenticate);

router.get(
  '/active',
  authorizeAny('services.view', 'services.create', 'services.update', 'service_categories.view'),
  asyncHandler(serviceCategoryController.listActive),
);
router.get('/', authorize('service_categories.view'), asyncHandler(serviceCategoryController.list));
router.get(
  '/:id',
  authorize('service_categories.view'),
  validate(serviceCategoryIdSchema, 'params'),
  asyncHandler(serviceCategoryController.getById),
);
router.post(
  '/',
  authorize('service_categories.create'),
  validate(createServiceCategorySchema),
  asyncHandler(serviceCategoryController.create),
);
router.put(
  '/:id',
  authorize('service_categories.update'),
  validate(serviceCategoryIdSchema, 'params'),
  validate(updateServiceCategorySchema),
  asyncHandler(serviceCategoryController.update),
);
router.delete(
  '/:id',
  authorize('service_categories.delete'),
  validate(serviceCategoryIdSchema, 'params'),
  asyncHandler(serviceCategoryController.remove),
);

export default router;
