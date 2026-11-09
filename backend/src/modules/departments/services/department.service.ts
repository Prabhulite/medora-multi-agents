import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/errors/AppError.js';
import { departmentRepository } from '../repositories/department.repository.js';
import type {
  CreateDepartmentInput,
  UpdateDepartmentInput,
} from '../validators/department.validators.js';

export const departmentService = {
  async list() {
    return departmentRepository.findAll();
  },

  async listActive() {
    return departmentRepository.findActive();
  },

  async getById(id: number) {
    const department = await departmentRepository.findById(id);
    if (!department) {
      throw new NotFoundError('Department not found');
    }
    return department;
  },

  async create(input: CreateDepartmentInput) {
    const code = input.code.trim().toLowerCase();
    if (await departmentRepository.existsByCode(code)) {
      throw new ConflictError('Department code already exists');
    }
    if (await departmentRepository.existsByName(input.name.trim())) {
      throw new ConflictError('Department name already exists');
    }

    return departmentRepository.create({
      code,
      name: input.name.trim(),
      isActive: input.isActive,
    });
  },

  async update(id: number, input: UpdateDepartmentInput) {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    const nextCode = input.code?.trim().toLowerCase();
    if (nextCode && (await departmentRepository.existsByCode(nextCode, id))) {
      throw new ConflictError('Department code already exists');
    }

    if (input.name && (await departmentRepository.existsByName(input.name.trim(), id))) {
      throw new ConflictError('Department name already exists');
    }

    const updated = await departmentRepository.update(id, {
      code: nextCode,
      name: input.name?.trim(),
      isActive: input.isActive,
    });

    if (!updated) {
      throw new NotFoundError('Department not found');
    }

    return updated;
  },

  async remove(id: number) {
    const existing = await departmentRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    const userCount = await departmentRepository.countUsers(id);
    if (userCount > 0) {
      throw new ForbiddenError(
        `Cannot delete department with ${userCount} linked user(s). Deactivate it instead.`,
      );
    }

    const deleted = await departmentRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Department not found');
    }
  },
};
