import { z } from 'zod';

export const createServiceCategorySchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Code may only contain letters, numbers, ., _, -'),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(255).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateServiceCategorySchema = createServiceCategorySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const serviceCategoryIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;
export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategorySchema>;
