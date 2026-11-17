import { z } from 'zod';

const careTypeSchema = z.enum(['OP', 'IP', 'Both']);

const serviceBaseSchema = z.object({
  serviceName: z.string().trim().min(2).max(160),
  categoryId: z.number().int().positive(),
  departmentId: z.number().int().positive(),
  serviceType: careTypeSchema,
  defaultPrice: z.number().min(0).max(99999999.99),
  taxPercent: z.number().min(0).max(100).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  billingApplicable: careTypeSchema.optional().default('Both'),
  allowDiscount: z.boolean().optional().default(true),
  defaultDiscountPercent: z.number().min(0).max(100).nullable().optional(),
  allowQuantity: z.boolean().optional().default(true),
  defaultQuantity: z.number().min(0.01).max(999999).optional().default(1),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  branchName: z.string().trim().max(120).nullable().optional(),
});

function refineDiscount(
  data: {
    allowDiscount?: boolean;
    defaultDiscountPercent?: number | null;
  },
  ctx: z.RefinementCtx,
) {
  const allowDiscount = data.allowDiscount ?? true;
  if (!allowDiscount) return;
  if (
    data.defaultDiscountPercent == null ||
    Number.isNaN(data.defaultDiscountPercent)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defaultDiscountPercent'],
      message: 'Default discount percentage is required when discount is allowed',
    });
  }
}

export const createServiceSchema = serviceBaseSchema.superRefine(refineDiscount);

export const updateServiceSchema = serviceBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
  .superRefine((data, ctx) => {
    if (data.allowDiscount === false) return;
    if (data.allowDiscount === true || data.defaultDiscountPercent !== undefined) {
      refineDiscount(
        {
          allowDiscount: data.allowDiscount ?? true,
          defaultDiscountPercent: data.defaultDiscountPercent,
        },
        ctx,
      );
    }
  });

export const serviceIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
