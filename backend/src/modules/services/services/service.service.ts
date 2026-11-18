import { AppDataSource } from '../../../config/data-source.js';
import {
  Department,
  ServiceCategory,
  ServiceMaster,
} from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import { serviceRepository } from '../repositories/service.repository.js';
import type { CreateServiceInput, UpdateServiceInput } from '../validators/service.validators.js';

async function assertCategory(id: number) {
  const category = await AppDataSource.getRepository(ServiceCategory).findOne({
    where: { id, isActive: true },
  });
  if (!category) throw new ValidationError('Active service category is required');
  return category;
}

async function assertDepartment(id: number) {
  const department = await AppDataSource.getRepository(Department).findOne({
    where: { id, isActive: true },
  });
  if (!department) throw new ValidationError('Active department is required');
  return department;
}

export const serviceService = {
  list() {
    return serviceRepository.findAll();
  },

  listActive() {
    return serviceRepository.findActive();
  },

  async getById(id: number) {
    const row = await serviceRepository.findById(id);
    if (!row) throw new NotFoundError('Service not found');
    return row;
  },

  async create(input: CreateServiceInput) {
    await assertCategory(input.categoryId);
    await assertDepartment(input.departmentId);

    return AppDataSource.transaction(async (manager) => {
      const serviceCode = await nextSequenceNumber(manager, 'SVC', 'SVC', 6);
      const existing = await manager.getRepository(ServiceMaster).findOne({
        where: { serviceCode },
      });
      if (existing) throw new ConflictError('Generated service code already exists');

      const saved = await manager.getRepository(ServiceMaster).save(
        manager.getRepository(ServiceMaster).create({
          serviceCode,
          serviceName: input.serviceName.trim(),
          categoryId: input.categoryId,
          departmentId: input.departmentId,
          serviceType: input.serviceType,
          defaultPrice: input.defaultPrice.toFixed(2),
          taxPercent:
            input.taxPercent == null || Number.isNaN(input.taxPercent)
              ? null
              : input.taxPercent.toFixed(2),
          description: input.description?.trim() || null,
          isActive: input.isActive ?? true,
          billingApplicable: input.billingApplicable ?? 'Both',
          allowDiscount: input.allowDiscount ?? true,
          defaultDiscountPercent:
            input.allowDiscount === false ||
            input.defaultDiscountPercent == null ||
            Number.isNaN(input.defaultDiscountPercent)
              ? null
              : input.defaultDiscountPercent.toFixed(2),
          allowQuantity: input.allowQuantity ?? true,
          defaultQuantity: String(input.defaultQuantity ?? 1),
          effectiveFrom: input.effectiveFrom,
          branchName: input.branchName?.trim() || null,
        }),
      );
      return saved.id;
    }).then(async (id) => {
      const created = await serviceRepository.findById(id);
      if (!created) throw new NotFoundError('Service not found after create');
      return created;
    });
  },

  async update(id: number, input: UpdateServiceInput) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ServiceMaster);
      const row = await repo.findOne({ where: { id } });
      if (!row) throw new NotFoundError('Service not found');

      if (input.categoryId != null) await assertCategory(input.categoryId);
      if (input.departmentId != null) await assertDepartment(input.departmentId);

      if (input.serviceName != null) row.serviceName = input.serviceName.trim();
      if (input.categoryId != null) row.categoryId = input.categoryId;
      if (input.departmentId != null) row.departmentId = input.departmentId;
      if (input.serviceType != null) row.serviceType = input.serviceType;
      if (input.defaultPrice != null) row.defaultPrice = input.defaultPrice.toFixed(2);
      if (input.taxPercent !== undefined) {
        row.taxPercent =
          input.taxPercent == null || Number.isNaN(input.taxPercent)
            ? null
            : input.taxPercent.toFixed(2);
      }
      if (input.description !== undefined) {
        row.description = input.description?.trim() || null;
      }
      if (input.isActive != null) row.isActive = input.isActive;
      if (input.billingApplicable != null) row.billingApplicable = input.billingApplicable;
      if (input.allowDiscount != null) row.allowDiscount = input.allowDiscount;
      if (input.allowDiscount === false) {
        row.defaultDiscountPercent = null;
      } else if (input.defaultDiscountPercent !== undefined) {
        row.defaultDiscountPercent =
          input.defaultDiscountPercent == null || Number.isNaN(input.defaultDiscountPercent)
            ? null
            : input.defaultDiscountPercent.toFixed(2);
      }
      if (input.allowQuantity != null) row.allowQuantity = input.allowQuantity;
      if (input.defaultQuantity != null) row.defaultQuantity = String(input.defaultQuantity);
      if (input.effectiveFrom != null) row.effectiveFrom = input.effectiveFrom;
      if (input.branchName !== undefined) row.branchName = input.branchName?.trim() || null;

      await repo.save(row);
      return serviceRepository.findById(id);
    });
  },

  async remove(id: number) {
    const row = await AppDataSource.getRepository(ServiceMaster).findOne({ where: { id } });
    if (!row) throw new NotFoundError('Service not found');
    await AppDataSource.getRepository(ServiceMaster).delete(id);
  },
};
