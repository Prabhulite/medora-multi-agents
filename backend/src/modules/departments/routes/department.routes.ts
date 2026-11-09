import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { departmentController } from '../controllers/department.controller.js';
import {
  createDepartmentSchema,
  departmentIdParamSchema,
  updateDepartmentSchema,
} from '../validators/department.validators.js';

const router = Router();

router.use(authenticate);

router.get(
  '/active',
  authorizeAny(
    'users.view',
    'users.create',
    'users.update',
    'departments.view',
    'doctors.view',
    'doctors.create',
    'doctors.update',
  ),
  asyncHandler(departmentController.listActive),
);

router.get('/', authorize('departments.view'), asyncHandler(departmentController.list));

router.get(
  '/:id',
  authorize('departments.view'),
  validate(departmentIdParamSchema, 'params'),
  asyncHandler(departmentController.getById),
);

router.post(
  '/',
  authorize('departments.create'),
  validate(createDepartmentSchema),
  asyncHandler(departmentController.create),
);

router.put(
  '/:id',
  authorize('departments.update'),
  validate(departmentIdParamSchema, 'params'),
  validate(updateDepartmentSchema),
  asyncHandler(departmentController.update),
);

router.delete(
  '/:id',
  authorize('departments.delete'),
  validate(departmentIdParamSchema, 'params'),
  asyncHandler(departmentController.remove),
);

export default router;
