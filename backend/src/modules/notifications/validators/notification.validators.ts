import { z } from 'zod';

export const listNotificationsSchema = z.object({ beforeId: z.coerce.number().int().positive().optional() });
export const notificationIdSchema = z.object({ id: z.coerce.number().int().positive() });
