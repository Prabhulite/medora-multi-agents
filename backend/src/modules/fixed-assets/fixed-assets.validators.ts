import { z } from 'zod';

const money = z.number().finite().nonnegative().max(999999999999.99).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7, 'Use at most two decimal places');
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
export const assetSchema = z.object({
  code: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(160), category: z.string().trim().min(1).max(80),
  location: optionalText(120), serialNumber: optionalText(100), purchaseDate: z.iso.date(), purchaseCost: money,
  salvageValue: money.default(0), usefulLifeMonths: z.number().int().min(1).max(1200).nullable().optional(), notes: optionalText(500),
}).strict().refine((v) => v.salvageValue <= v.purchaseCost, { path: ['salvageValue'], message: 'Salvage value cannot exceed purchase cost' });
export const updateAssetSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(), category: z.string().trim().min(1).max(80).optional(), location: optionalText(120), serialNumber: optionalText(100),
  purchaseDate: z.iso.date().optional(), purchaseCost: money.optional(), salvageValue: money.optional(), usefulLifeMonths: z.number().int().min(1).max(1200).nullable().optional(),
  status: z.enum(['active', 'in_maintenance', 'disposed']).optional(), disposalDate: z.iso.date().nullable().optional(), disposalValue: money.nullable().optional(), notes: optionalText(500),
}).strict().refine((v) => Object.keys(v).length > 0, 'Supply at least one field');
export const maintenanceSchema = z.object({ performedOn: z.iso.date(), description: z.string().trim().min(1).max(160), cost: money.default(0), provider: optionalText(120), notes: optionalText(500) }).strict();
export const assetIdSchema = z.object({ id: z.coerce.number().int().positive() });
export type AssetInput = z.infer<typeof assetSchema>;
export type AssetUpdate = z.infer<typeof updateAssetSchema>;
export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
