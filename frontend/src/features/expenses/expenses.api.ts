import { api } from '../../lib/api';

export interface ExpenseItem { entryId: number; title: string; category: string; amount: number; date: string; notes: string | null; type: 'activity' | 'expense' }
export interface ExpenseData { summary: { entriesCount: number; totalSpend: number; averageSpend: number; categoriesCount: number }; items: ExpenseItem[] }
export interface RecentActivity { activityId: number; message: string; createdAt: string }
export interface ExpenseInput { title: string; category: string; amount: number; date: string; notes?: string; type: 'expense' }

export const expensesApi = {
  async list() { return (await api.get<{ data: ExpenseData }>('/expenses')).data.data; },
  async activities() { return (await api.get<{ data: RecentActivity[] }>('/expenses/activities')).data.data; },
  async create(input: ExpenseInput) { return (await api.post('/expenses', input)).data; },
  async remove(id: number) { return (await api.delete(`/expenses/${id}`)).data; },
};
