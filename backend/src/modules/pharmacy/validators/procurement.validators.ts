import { z } from 'zod';
const positiveInt = z.number().int().positive();
export const createSupplierSchema = z.object({ code: z.string().trim().min(2).max(40), name: z.string().trim().min(2).max(180), contactPerson: z.string().trim().max(160).nullable().optional(), phone: z.string().trim().max(40).nullable().optional(), email: z.string().email().max(160).nullable().optional(), address: z.string().trim().max(2000).nullable().optional() });
export const createPurchaseOrderSchema = z.object({ supplierId: positiveInt, orderDate: z.string().date(), expectedDate: z.string().date().nullable().optional(), notes: z.string().trim().max(2000).nullable().optional(), items: z.array(z.object({ medicationId: positiveInt, quantity: positiveInt.max(1000000), unitPrice: z.number().min(0).max(100000000) })).min(1) });
export const receivePurchaseOrderSchema = z.object({ batchNumber: z.string().trim().min(1).max(80), expiryDate: z.string().date(), storageLocation: z.string().trim().max(120).nullable().optional(), reference: z.string().trim().max(160).nullable().optional() });
export const purchaseOrderIdParamSchema = z.object({ id: z.coerce.number().int().positive() });
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
