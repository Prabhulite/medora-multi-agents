import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { departmentService } from '../services/department.service.js';

export const departmentController = {
  async list(_req: Request, res: Response) {
    const departments = await departmentService.list();
    return sendSuccess(res, departments, 'Departments fetched');
  },

  async listActive(_req: Request, res: Response) {
    const departments = await departmentService.listActive();
    return sendSuccess(res, departments, 'Active departments fetched');
  },

  async getById(req: Request, res: Response) {
    const department = await departmentService.getById(Number(req.params.id));
    return sendSuccess(res, department, 'Department fetched');
  },

  async create(req: Request, res: Response) {
    const department = await departmentService.create(req.body);
    return sendCreated(res, department, 'Department created');
  },

  async update(req: Request, res: Response) {
    const department = await departmentService.update(Number(req.params.id), req.body);
    return sendSuccess(res, department, 'Department updated');
  },

  async remove(req: Request, res: Response) {
    await departmentService.remove(Number(req.params.id));
    return sendSuccess(res, null, 'Department deleted');
  },
};
