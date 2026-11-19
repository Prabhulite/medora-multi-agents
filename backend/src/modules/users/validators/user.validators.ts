import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const optionalEmail = z
  .union([z.string().trim().email().max(160), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

const genderSchema = z
  .union([z.enum(['male', 'female', 'other']), z.literal(''), z.null()])
  .optional()
  .transform((value) => (value ? value : null));

export const createUserSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee ID is required').max(40),
  fullName: z.string().trim().min(2, 'Employee name is required').max(160),
  mobileNumber: z
    .string()
    .trim()
    .min(8, 'Mobile number is required')
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, 'Mobile number format is invalid'),
  email: optionalEmail,
  gender: genderSchema,
  designation: z
    .string().trim().max(120).nullable()
    .optional()
    .transform((value) => (value ? value : null)),
  departmentId: z.number().int().positive('Department is required'),
  username: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, ., _, -'),
  password: passwordSchema,
  isActive: z.boolean().default(true),
  roleIds: z.array(z.number().int().positive()).min(1, 'At least one role is required'),
});

export const updateUserSchema = z
  .object({
    employeeId: z.string().trim().min(1).max(40).optional(),
    fullName: z.string().trim().min(2).max(160).optional(),
    mobileNumber: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, 'Mobile number format is invalid')
      .optional(),
    email: optionalEmail,
    gender: genderSchema,
    designation: z
      .string().trim().max(120).nullable()
      .optional()
      .transform((value) => (value === undefined ? undefined : value ? value : null)),
    departmentId: z.number().int().positive().nullable().optional(),
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
