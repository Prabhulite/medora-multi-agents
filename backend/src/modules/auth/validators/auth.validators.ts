import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(80, 'Username must be at most 80 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(12).max(128) }).refine((value) => value.currentPassword !== value.newPassword, { path: ['newPassword'], message: 'New password must be different' });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
