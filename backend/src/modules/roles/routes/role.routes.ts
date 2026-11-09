import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { roleController } from '../controllers/role.controller.js';
import {
  createRoleSchema,
  roleIdParamSchema,
  updateRoleSchema,
} from '../validators/role.validators.js';

const router = Router();

router.use(authenticate);

router.get(
  '/permissions',
  authorize('permissions.view'),
  asyncHandler(roleController.listPermissions),
);

router.get('/', authorize('roles.view'), asyncHandler(roleController.list));
router.get(
  '/:id',
  authorize('roles.view'),
  validate(roleIdParamSchema, 'params'),
  asyncHandler(roleController.getById),
);
router.post(
  '/',
  authorize('roles.create'),
  validate(createRoleSchema),
  asyncHandler(roleController.create),
);
router.put(
  '/:id',
  authorize('roles.update'),
  validate(roleIdParamSchema, 'params'),
  validate(updateRoleSchema),
  asyncHandler(roleController.update),
);
router.delete(
  '/:id',
  authorize('roles.delete'),
  validate(roleIdParamSchema, 'params'),
  asyncHandler(roleController.remove),
);

export default router;
