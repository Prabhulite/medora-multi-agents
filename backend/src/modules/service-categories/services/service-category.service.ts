import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/errors/AppError.js';
import { serviceCategoryRepository } from '../repositories/service-category.repository.js';
import type {
  CreateServiceCategoryInput,
  UpdateServiceCategoryInput,
} from '../validators/service-category.validators.js';

export const serviceCategoryService = {
  list() {
    return serviceCategoryRepository.findAll();
  },

  listActive() {
    return serviceCategoryRepository.findActive();
  },

  async getById(id: number) {
    const row = await serviceCategoryRepository.findById(id);
    if (!row) throw new NotFoundError('Service category not found');
    return row;
  },

  async create(input: CreateServiceCategoryInput) {
    const code = input.code.trim().toLowerCase();
    if (await serviceCategoryRepository.existsByCode(code)) {
      throw new ConflictError('Service category code already exists');
    }
    if (await serviceCategoryRepository.existsByName(input.name.trim())) {
      throw new ConflictError('Service category name already exists');
    }
    return serviceCategoryRepository.create({
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
    });
  },

  async update(id: number, input: UpdateServiceCategoryInput) {
    const existing = await serviceCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Service category not found');

    const nextCode = input.code?.trim().toLowerCase();
    if (nextCode && (await serviceCategoryRepository.existsByCode(nextCode, id))) {
      throw new ConflictError('Service category code already exists');
    }
    if (input.name && (await serviceCategoryRepository.existsByName(input.name.trim(), id))) {
      throw new ConflictError('Service category name already exists');
    }

    const updated = await serviceCategoryRepository.update(id, {
      code: nextCode,
      name: input.name?.trim(),
      description:
        input.description === undefined ? undefined : input.description?.trim() || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
    if (!updated) throw new NotFoundError('Service category not found');
    return updated;
  },

  async remove(id: number) {
    const existing = await serviceCategoryRepository.findById(id);
    if (!existing) throw new NotFoundError('Service category not found');
    const count = await serviceCategoryRepository.countServices(id);
    if (count > 0) {
      throw new ForbiddenError(
        `Cannot delete category with ${count} linked service(s). Deactivate it instead.`,
      );
    }
    const deleted = await serviceCategoryRepository.delete(id);
    if (!deleted) throw new NotFoundError('Service category not found');
  },
};
