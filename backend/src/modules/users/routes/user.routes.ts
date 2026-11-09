import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { userController } from '../controllers/user.controller.js';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from '../validators/user.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('users.view'), asyncHandler(userController.list));
router.get(
  '/:id',
  authorize('users.view'),
  validate(userIdParamSchema, 'params'),
  asyncHandler(userController.getById),
);
router.post(
  '/',
  authorize('users.create'),
  validate(createUserSchema),
  asyncHandler(userController.create),
);
router.put(
  '/:id',
  authorize('users.update'),
  validate(userIdParamSchema, 'params'),
  validate(updateUserSchema),
  asyncHandler(userController.update),
);
router.delete(
  '/:id',
  authorize('users.delete'),
  validate(userIdParamSchema, 'params'),
  asyncHandler(userController.remove),
);

export default router;
