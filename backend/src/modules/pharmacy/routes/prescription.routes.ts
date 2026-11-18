import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { authorize, authorizeAny } from '../../../middleware/authorize.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { prescriptionController } from '../controllers/prescription.controller.js';
import { createPrescriptionSchema, patientIdParamSchema } from '../validators/prescription.validators.js';

const router = Router();
router.use(authenticate);
router.get('/medications', authorizeAny('pharmacy.view', 'pharmacy.create', 'pharmacy.inventory.view'), asyncHandler(prescriptionController.listMedications));
router.get('/patients/:patientId/prescriptions', authorizeAny('pharmacy.view', 'pharmacy.inventory.update', 'pharmacy.create'), validate(patientIdParamSchema, 'params'), asyncHandler(prescriptionController.listByPatient));
router.post('/prescriptions', authorize('pharmacy.create'), validate(createPrescriptionSchema), asyncHandler(prescriptionController.create));
export default router;
