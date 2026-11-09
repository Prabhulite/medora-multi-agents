import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { menuController } from '../controllers/menu.controller.js';
import {
  createMenuSchema,
  menuIdParamSchema,
  updateMenuSchema,
} from '../validators/menu.validators.js';

const router = Router();

router.use(authenticate);

router.get('/nav', asyncHandler(menuController.listNav));

router.get('/', authorize('menus.view'), asyncHandler(menuController.list));
router.get(
  '/:id',
  authorize('menus.view'),
  validate(menuIdParamSchema, 'params'),
  asyncHandler(menuController.getById),
);
router.post(
  '/',
  authorize('menus.create'),
  validate(createMenuSchema),
  asyncHandler(menuController.create),
);
router.put(
  '/:id',
  authorize('menus.update'),
  validate(menuIdParamSchema, 'params'),
  validate(updateMenuSchema),
  asyncHandler(menuController.update),
);
router.delete(
  '/:id',
  authorize('menus.delete'),
  validate(menuIdParamSchema, 'params'),
  asyncHandler(menuController.remove),
);

export default router;
