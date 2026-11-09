import { z } from 'zod';

export const createRoleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9_]+$/, 'Role code must be lowercase letters, numbers, or underscores'),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(255).optional().nullable(),
  isActive: z.boolean().default(true),
  permissionIds: z
    .array(z.number().int().positive())
    .min(1, 'At least one permission is required'),
});

export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(255).optional().nullable(),
    isActive: z.boolean().optional(),
    permissionIds: z.array(z.number().int().positive()).min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const roleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
