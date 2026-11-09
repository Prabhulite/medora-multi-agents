import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, ., _, -'),
  email: z.string().trim().email().max(160),
  fullName: z.string().trim().min(2).max(160),
  password: passwordSchema,
  isActive: z.boolean().default(true),
  roleIds: z.array(z.number().int().positive()).min(1, 'At least one role is required'),
});

export const updateUserSchema = z
  .object({
    email: z.string().trim().email().max(160).optional(),
    fullName: z.string().trim().min(2).max(160).optional(),
    password: passwordSchema.optional(),
    isActive: z.boolean().optional(),
    roleIds: z.array(z.number().int().positive()).min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
