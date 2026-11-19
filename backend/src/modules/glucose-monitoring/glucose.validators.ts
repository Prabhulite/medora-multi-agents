import { z } from 'zod';

export const patientParams = z.object({ patientId: z.coerce.number().int().positive() });
export const createGlucoseReading = z.strictObject({
  valueMgDl: z.number().finite().min(10).max(1000).multipleOf(0.1),
  context: z.enum(['fasting', 'random', 'post_meal']),
  measuredAt: z.iso.datetime({ offset: true }).refine(value => new Date(value).getTime() <= Date.now() + 60_000, 'Measurement cannot be in the future'),
  notes: z.string().trim().max(1000).nullable().optional(),
});
