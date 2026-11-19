import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../shared/utils/response.js';
import { expenseService } from '../services/expense.service.js';

export const expenseController = {
  async list(_req: Request, res: Response) { return sendSuccess(res, await expenseService.list(), 'Expenses fetched'); },
  async activities(_req: Request, res: Response) { return sendSuccess(res, await expenseService.activities(), 'Activities fetched'); },
  async create(req: Request, res: Response) { return sendCreated(res, await expenseService.create(req.body, req.user!.id), 'Expense created'); },
  async remove(req: Request, res: Response) { return sendSuccess(res, await expenseService.remove(Number(req.params.id)), 'Expense deleted'); },
};
