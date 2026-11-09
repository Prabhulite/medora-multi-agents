import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/errors/AppError.js';
import { specializationRepository } from '../repositories/specialization.repository.js';
import type {
  CreateSpecializationInput,
  UpdateSpecializationInput,
} from '../validators/specialization.validators.js';

export const specializationService = {
  list() {
    return specializationRepository.findAll();
  },

  listActive() {
    return specializationRepository.findActive();
  },

  async getById(id: number) {
    const row = await specializationRepository.findById(id);
    if (!row) throw new NotFoundError('Specialization not found');
    return row;
  },

  async create(input: CreateSpecializationInput) {
    const code = input.code.trim().toLowerCase();
    if (await specializationRepository.existsByCode(code)) {
      throw new ConflictError('Specialization code already exists');
    }
    if (await specializationRepository.existsByName(input.name.trim())) {
      throw new ConflictError('Specialization name already exists');
    }
    return specializationRepository.create({
      code,
      name: input.name.trim(),
      isActive: input.isActive,
    });
  },

  async update(id: number, input: UpdateSpecializationInput) {
    const existing = await specializationRepository.findById(id);
    if (!existing) throw new NotFoundError('Specialization not found');

    const nextCode = input.code?.trim().toLowerCase();
    if (nextCode && (await specializationRepository.existsByCode(nextCode, id))) {
      throw new ConflictError('Specialization code already exists');
    }
    if (input.name && (await specializationRepository.existsByName(input.name.trim(), id))) {
      throw new ConflictError('Specialization name already exists');
    }

    const updated = await specializationRepository.update(id, {
      code: nextCode,
      name: input.name?.trim(),
      isActive: input.isActive,
    });
    if (!updated) throw new NotFoundError('Specialization not found');
    return updated;
  },

  async remove(id: number) {
    const existing = await specializationRepository.findById(id);
    if (!existing) throw new NotFoundError('Specialization not found');

    const doctorCount = await specializationRepository.countDoctors(id);
    if (doctorCount > 0) {
      throw new ForbiddenError(
        `Cannot delete specialization with ${doctorCount} linked doctor(s). Deactivate it instead.`,
      );
    }

    const deleted = await specializationRepository.delete(id);
    if (!deleted) throw new NotFoundError('Specialization not found');
  },
};
