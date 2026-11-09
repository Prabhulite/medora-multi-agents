import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { hospitalProfileController } from '../controllers/hospital-profile.controller.js';
import { upsertHospitalProfileSchema } from '../validators/hospital-profile.validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('hospital_profile.view'), asyncHandler(hospitalProfileController.get));

router.put(
  '/',
  authorize('hospital_profile.update'),
  validate(upsertHospitalProfileSchema),
  asyncHandler(hospitalProfileController.upsert),
);

export default router;
