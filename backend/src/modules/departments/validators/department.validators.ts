import { z } from 'zod';

export const createDepartmentSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Code may only contain letters, numbers, ., _, -'),
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean().default(true),
});

export const updateDepartmentSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Code may only contain letters, numbers, ., _, -')
      .optional(),
    name: z.string().trim().min(2).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const departmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
