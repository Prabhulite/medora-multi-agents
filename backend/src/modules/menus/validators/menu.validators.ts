import { z } from 'zod';

export const menuIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMenuSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, 'Code is required')
    .max(80)
    .regex(/^[a-z][a-z0-9_]*$/, 'Code must be lowercase snake_case'),
  label: z.string().trim().min(2, 'Label is required').max(120),
  route: z
    .string()
    .trim()
    .min(1, 'Route is required')
    .max(160)
    .regex(/^\/[A-Za-z0-9/_-]*$/, 'Route must start with /'),
  icon: z.string().trim().min(2).max(60).default('dashboard'),
  permissionCode: z.string().trim().min(3).max(100).nullable().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export const updateMenuSchema = z.object({
  label: z.string().trim().min(2).max(120).optional(),
  route: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^\/[A-Za-z0-9/_-]*$/, 'Route must start with /')
    .optional(),
  icon: z.string().trim().min(2).max(60).optional(),
  permissionCode: z.string().trim().min(3).max(100).nullable().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
