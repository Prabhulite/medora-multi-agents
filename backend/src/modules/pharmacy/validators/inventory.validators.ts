import { z } from 'zod';

const positiveInt = z.number().int().positive();
export const inventoryListSchema = z.object({ medicationId: z.coerce.number().int().positive().optional(), lowStock: z.enum(['true', 'false']).transform((v) => v === 'true').optional() });
export const inventoryWorklistSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(10).max(100).default(25), search: z.string().trim().max(80).optional(), alert: z.enum(['low-stock', 'expired-stock', 'expiring-stock', 'quarantined-stock']).optional() });
export type InventoryWorklistInput = z.infer<typeof inventoryWorklistSchema>;
export const inventoryPatientLookupSchema = z.object({ search: z.string().trim().min(2).max(80) });
export const adjustStockSchema = z.object({ expectedQuantity: z.number().int().min(0).max(1000000), countedQuantity: z.number().int().min(0).max(1000000), reason: z.string().trim().min(5).max(500) });
export const batchHoldSchema = z.object({ reason: z.string().trim().min(5).max(500) });
export const disposeStockSchema = z.object({ expectedQuantity: z.number().int().min(1).max(1000000), quantity: positiveInt.max(1000000), reason: z.string().trim().min(5).max(500) });
export type DisposeStockInput = z.infer<typeof disposeStockSchema>;
export const stockMovementListSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(10).max(100).default(25) });
export const receiveStockSchema = z.object({ medicationId: positiveInt, batchNumber: z.string().trim().min(1).max(80), expiryDate: z.string().date(), purchasePrice: z.number().min(0).max(100000000), sellingPrice: z.number().min(0).max(100000000), quantity: positiveInt.max(1000000), reorderLevel: z.number().int().min(0).max(1000000).default(0), storageLocation: z.string().trim().max(120).nullable().optional(), reference: z.string().trim().max(160).nullable().optional(), notes: z.string().trim().max(2000).nullable().optional() });
export const dispenseStockSchema = z.object({ batchId: positiveInt, quantity: positiveInt.max(1000000), patientId: positiveInt.nullable().optional(), prescriptionId: positiveInt.nullable().optional(), reference: z.string().trim().max(160).nullable().optional(), notes: z.string().trim().max(2000).nullable().optional(), fefoOverrideReason: z.string().trim().min(5).max(500).nullable().optional() }).refine((value) => !value.prescriptionId || !!value.patientId, { path: ['patientId'], message: 'Patient is required for prescription fulfillment' });
export const batchIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;
export type DispenseStockInput = z.infer<typeof dispenseStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type StockMovementListInput = z.infer<typeof stockMovementListSchema>;
