import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().optional().default(''),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('8h'),
  SUPER_ADMIN_USERNAME: z.string().min(3),
  SUPER_ADMIN_PASSWORD: z.string().min(8),
  SUPER_ADMIN_FULL_NAME: z.string().min(2),
  SUPER_ADMIN_EMAIL: z.string().email(),
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== 'production') return;
  for (const field of ['APP_URL', 'FRONTEND_URL'] as const) {
    const url = new URL(value[field]);
    if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.hostname.endsWith('.example') || url.hostname.endsWith('.example.com')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Production requires a public HTTPS URL' });
    }
  }
  if (!value.DB_PASSWORD || value.DB_PASSWORD === 'change-this-database-password') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['DB_PASSWORD'], message: 'Set a production database password' });
  if (value.JWT_SECRET.length < 32 || value.JWT_SECRET === 'replace-with-a-long-random-production-secret' || value.JWT_SECRET === 'change-me-to-a-long-random-secret') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_SECRET'], message: 'Set a unique production signing secret of at least 32 characters' });
  if (value.SUPER_ADMIN_PASSWORD.length < 12 || value.SUPER_ADMIN_PASSWORD === 'change-this-admin-password') ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['SUPER_ADMIN_PASSWORD'], message: 'Set a unique production admin password of at least 12 characters' });
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
