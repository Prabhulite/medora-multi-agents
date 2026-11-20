import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { AppDataSource } from '../../../config/data-source.js';
import { Doctor } from '../../../database/entities/index.js';
import { sendSuccess } from '../../../shared/utils/response.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { doctorController } from '../controllers/doctor.controller.js';
import { doctorWorkspaceController } from '../controllers/doctor-workspace.controller.js';
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
router.get('/consultants', authorizeAny('visits.view', 'visits.checkin', 'appointments.create', 'billing.create', 'inpatient.create', 'patients.create', 'patients.update', 'surgery.view', 'doctors.view'), asyncHandler(async (_req, res) => {
  const doctors = await AppDataSource.getRepository(Doctor).find({ where: { isActive: true }, select: { id: true, doctorCode: true, name: true, departmentId: true, isActive: true }, order: { name: 'ASC' } });
  return sendSuccess(res, doctors);
}));
router.get('/me/workspace', authorize('doctors.workspace.view'), asyncHandler(doctorWorkspaceController.getMine));
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
