import { z } from 'zod';

export const vehicleSchema = z.object({ code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/), registrationNumber: z.string().trim().min(4).max(40), name: z.string().trim().min(2).max(120) });
export const vehicleUpdateSchema = vehicleSchema.partial().extend({ isActive: z.boolean().optional() });
export const vehicleIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const driverIdParamSchema = vehicleIdParamSchema;
export const registerDriverSchema = z.object({ staffId: z.number().int().positive(), licenseNumber: z.string().trim().min(4).max(80), licenseValidUntil: z.string().date() });
export const updateDriverSchema = z.object({ licenseNumber: z.string().trim().min(4).max(80).optional(), licenseValidUntil: z.string().date().optional(), isActive: z.boolean().optional() });
export const tripIdParamSchema = vehicleIdParamSchema;
export const tripListQuerySchema = z.object({ status: z.enum(['assigned', 'en_route', 'on_scene', 'transporting', 'completed', 'cancelled']).optional(), patientId: z.coerce.number().int().positive().optional() });
export const createTripSchema = z.object({ vehicleId: z.number().int().positive(), driverId: z.number().int().positive(), patientId: z.number().int().positive().nullable().optional(), pickupLocation: z.string().trim().min(3).max(500), destination: z.string().trim().min(3).max(500), notes: z.string().trim().max(2000).nullable().optional() });
export const tripStatusSchema = z.object({ status: z.enum(['en_route', 'on_scene', 'transporting', 'completed', 'cancelled']), closureNote: z.string().trim().max(2000).nullable().optional() }).superRefine((value, context) => { if ((value.status === 'completed' || value.status === 'cancelled') && (!value.closureNote || value.closureNote.length < 2)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['closureNote'], message: 'A completion or cancellation note is required' }); });
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type VehicleUpdateInput = z.infer<typeof vehicleUpdateSchema>;
export type RegisterDriverInput = z.infer<typeof registerDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type TripStatusInput = z.infer<typeof tripStatusSchema>;
export type TripListQuery = z.infer<typeof tripListQuerySchema>;
