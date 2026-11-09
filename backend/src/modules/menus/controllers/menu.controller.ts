import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError.js';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { menuService } from '../services/menu.service.js';
import type { CreateMenuInput, UpdateMenuInput } from '../validators/menu.validators.js';

export const menuController = {
  async listNav(req: Request, res: Response) {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const menus = await menuService.listNav(req.user);
    return sendSuccess(res, menus, 'Navigation menus fetched');
  },

  async list(_req: Request, res: Response) {
    const menus = await menuService.list();
    return sendSuccess(res, menus, 'Menus fetched');
  },

  async getById(req: Request, res: Response) {
    const menu = await menuService.getById(Number(req.params.id));
    return sendSuccess(res, menu, 'Menu fetched');
  },

  async create(req: Request, res: Response) {
    const menu = await menuService.create(req.body as CreateMenuInput);
    return sendCreated(res, menu, 'Menu created');
  },

  async update(req: Request, res: Response) {
    const menu = await menuService.update(Number(req.params.id), req.body as UpdateMenuInput);
    return sendSuccess(res, menu, 'Menu updated');
  },

  async remove(req: Request, res: Response) {
    await menuService.remove(Number(req.params.id));
    return sendSuccess(res, null, 'Menu deleted');
  },
};
