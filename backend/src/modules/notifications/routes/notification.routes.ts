import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { notificationController } from '../controllers/notification.controller.js';
import { listNotificationsSchema, notificationIdSchema } from '../validators/notification.validators.js';

const router = Router();
router.use(authenticate);
router.get('/', validate(listNotificationsSchema, 'query'), asyncHandler(notificationController.list));
router.patch('/:id/read', validate(notificationIdSchema, 'params'), asyncHandler(notificationController.read));
export default router;
