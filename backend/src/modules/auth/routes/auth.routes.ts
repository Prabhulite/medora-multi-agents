import { Router } from 'express';
import { authenticate } from '../../../middleware/authenticate.js';
import { validate } from '../../../middleware/validate.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { authController } from '../controllers/auth.controller.js';
import { changePasswordSchema, loginSchema } from '../validators/auth.validators.js';

const router = Router();

router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(authController.changePassword));

export default router;
