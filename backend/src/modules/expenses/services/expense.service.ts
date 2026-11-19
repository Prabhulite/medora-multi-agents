import { AppDataSource } from '../../../config/data-source.js';
import { ExpenseActivity } from '../../../database/entities/ExpenseActivity.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import type { CreateExpenseInput } from '../validators/expense.validators.js';

export const expenseService = {
  async list() {
    const items = await AppDataSource.getRepository(ExpenseActivity).find({ order: { date: 'DESC', createdAt: 'DESC' } });
    const totalSpend = items.reduce((sum, item) => sum + (item.type === 'expense' ? Number(item.amount) : 0), 0);
    const expenses = items.filter((item) => item.type === 'expense');
    return {
      summary: { entriesCount: expenses.length, totalSpend, averageSpend: expenses.length ? totalSpend / expenses.length : 0, categoriesCount: new Set(expenses.map((item) => item.category)).size },
      items: items.map((item) => ({ entryId: item.id, title: item.title, category: item.category, amount: Number(item.amount), date: item.date, notes: item.notes, type: item.type })),
    };
  },
  async activities() {
    const rows = await AppDataSource.getRepository(ExpenseActivity).find({ order: { createdAt: 'DESC' }, take: 30 });
    return rows.map((row) => ({ activityId: row.id, message: `${row.type === 'expense' ? 'Expense' : 'Activity'}: ${row.title}`, createdAt: row.createdAt }));
  },
  async create(input: CreateExpenseInput, userId: number) {
    const repo = AppDataSource.getRepository(ExpenseActivity);
    const saved = await repo.save(repo.create({ ...input, amount: input.amount.toFixed(2), notes: input.notes || null, createdByUserId: userId }));
    return { entryId: saved.id };
  },
  async remove(id: number) {
    const result = await AppDataSource.getRepository(ExpenseActivity).delete(id);
    if (!result.affected) throw new NotFoundError('Expense entry not found');
    return { entryId: id };
  },
};
