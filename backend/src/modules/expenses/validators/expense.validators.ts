import { z } from 'zod';

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  amount: z.number().finite().positive().max(9999999999.99).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7, 'Amount must have at most two decimal places'),
  date: z.iso.date(),
  notes: z.string().trim().max(500).optional(),
  type: z.enum(['activity', 'expense']).default('expense'),
});

export const expenseIdSchema = z.object({ id: z.coerce.number().int().positive() });
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
