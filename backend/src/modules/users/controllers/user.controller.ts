import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { userService } from '../services/user.service.js';
import type { CreateUserInput, UpdateUserInput } from '../validators/user.validators.js';

export const userController = {
  async list(_req: Request, res: Response) {
    const users = await userService.list();
    return sendSuccess(res, users, 'Users fetched');
  },

  async getById(req: Request, res: Response) {
    const user = await userService.getById(Number(req.params.id));
    return sendSuccess(res, user, 'User fetched');
  },

  async create(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const user = await userService.create(req.body as CreateUserInput, req.user.id);
    return sendCreated(res, user, 'User created');
  },

  async update(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const user = await userService.update(
      Number(req.params.id),
      req.body as UpdateUserInput,
      req.user.id,
    );
    return sendSuccess(res, user, 'User updated');
  },

  async remove(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    await userService.remove(Number(req.params.id), req.user.id);
    return sendSuccess(res, null, 'User deleted');
  },
};
