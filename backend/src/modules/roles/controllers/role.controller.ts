import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { roleService } from '../services/role.service.js';
import type { CreateRoleInput, UpdateRoleInput } from '../validators/role.validators.js';

export const roleController = {
  async list(_req: Request, res: Response) {
    const roles = await roleService.list();
    return sendSuccess(res, roles, 'Roles fetched');
  },

  async getById(req: Request, res: Response) {
    const role = await roleService.getById(Number(req.params.id));
    return sendSuccess(res, role, 'Role fetched');
  },

  async listPermissions(_req: Request, res: Response) {
    const permissions = await roleService.listPermissions();
    return sendSuccess(res, permissions, 'Permissions fetched');
  },

  async create(req: Request, res: Response) {
    const role = await roleService.create(req.body as CreateRoleInput);
    return sendCreated(res, role, 'Role created');
  },

  async update(req: Request, res: Response) {
    const role = await roleService.update(Number(req.params.id), req.body as UpdateRoleInput);
    return sendSuccess(res, role, 'Role updated');
  },

  async remove(req: Request, res: Response) {
    await roleService.remove(Number(req.params.id));
    return sendSuccess(res, null, 'Role deleted');
  },
};
