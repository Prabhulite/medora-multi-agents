import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/utils/response.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import { authService } from '../services/auth.service.js';
import type { LoginInput } from '../validators/auth.validators.js';

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body as LoginInput);
    return sendSuccess(res, result, 'Login successful');
  },

  async me(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const user = await authService.me(req.user.id);
    return sendSuccess(res, user, 'Profile loaded');
  },
};
