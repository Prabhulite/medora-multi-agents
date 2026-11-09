import { z } from 'zod';

export const createSpecializationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Code may only contain letters, numbers, ., _, -'),
  name: z.string().trim().min(2).max(120),
  isActive: z.boolean().default(true),
});

export const updateSpecializationSchema = z
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

export const specializationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateSpecializationInput = z.infer<typeof createSpecializationSchema>;
export type UpdateSpecializationInput = z.infer<typeof updateSpecializationSchema>;
