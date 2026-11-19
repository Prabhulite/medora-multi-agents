import { z } from 'zod';

export const ticketIdSchema = z.object({ id: z.coerce.number().int().positive() });
export const createTicketSchema = z.object({ issueTitle: z.string().trim().min(3).max(180), description: z.string().trim().min(5).max(10000), priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium') });
export const listTicketSchema = z.object({ status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(), scope: z.enum(['mine', 'all']).default('mine') });
export const updateTicketSchema = z.object({ status: z.enum(['In Progress', 'Resolved', 'Closed']) });
export const respondTicketSchema = z.object({ message: z.string().trim().min(1).max(10000) });
