import { z } from 'zod';

export const accountCandidateSchema = z.object({ search: z.string().trim().min(2).max(80) });
export const linkDoctorAccountSchema = z.object({ userId: z.number().int().positive(), doctorCode: z.string().trim().min(2).max(20), reason: z.string().trim().min(10).max(500) });
export const unlinkDoctorAccountSchema = z.object({ doctorCode: z.string().trim().min(2).max(20), reason: z.string().trim().min(10).max(500) });
export type LinkDoctorAccountInput = z.infer<typeof linkDoctorAccountSchema>;
export type UnlinkDoctorAccountInput = z.infer<typeof unlinkDoctorAccountSchema>;
