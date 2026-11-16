import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/utils/response.js';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import { authService } from '../services/auth.service.js';
import type { LoginInput } from '../validators/auth.validators.js';

export const authController = {
  async login(req: Request, res: Response) {
    const result = await authService.login(req.body as LoginInput);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `medora_session=${result.token}; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax${secure}`);
    return sendSuccess(res, result, 'Login successful');
  },

  async logout(_req: Request, res: Response) {
    res.setHeader('Set-Cookie', 'medora_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
    return res.json({ success: true, message: 'Logged out' });
  },

  async me(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const user = await authService.me(req.user.id);
    return sendSuccess(res, user, 'Profile loaded');
  },
  async changePassword(req: Request, res: Response) {
    if (!req.user) throw new UnauthorizedError();
    await authService.changePassword(req.user.id, req.body);
    res.setHeader('Set-Cookie', 'medora_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax');
    return sendSuccess(res, null, 'Password changed; sign in again');
  },
};
