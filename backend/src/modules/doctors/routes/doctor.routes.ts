import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { doctorController } from '../controllers/doctor.controller.js';
import { doctorAccountController } from '../controllers/doctor-account.controller.js';
import { accountCandidateSchema, linkDoctorAccountSchema, unlinkDoctorAccountSchema } from '../validators/doctor-account.validators.js';
import {
  createDoctorSchema,
  doctorIdParamSchema,
  updateDoctorSchema,
} from '../validators/doctor.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('doctors.view'), asyncHandler(doctorController.list));
router.get('/account-candidates', authorize('doctors.account_link'), validate(accountCandidateSchema, 'query'), asyncHandler(doctorAccountController.candidates));
router.get('/:id/account-link', authorize('doctors.account_link'), validate(doctorIdParamSchema, 'params'), asyncHandler(doctorAccountController.get));
router.post('/:id/account-link', authorize('doctors.account_link'), validate(doctorIdParamSchema, 'params'), validate(linkDoctorAccountSchema), asyncHandler(doctorAccountController.link));
router.post('/:id/unlink-account', authorize('doctors.account_link'), validate(doctorIdParamSchema, 'params'), validate(unlinkDoctorAccountSchema), asyncHandler(doctorAccountController.unlink));

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
