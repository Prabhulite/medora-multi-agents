import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/AppError.js';
import { permissionRepository } from '../../permissions/repositories/permission.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import type { CreateRoleInput, UpdateRoleInput } from '../validators/role.validators.js';

function toPublicRole(role: NonNullable<Awaited<ReturnType<typeof roleRepository.findById>>>) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    createdById: role.createdById,
    createdByName: role.createdByName,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissionIds: role.permissionIds,
    permissionCodes: role.permissionCodes,
  };
}

async function assertValidPermissions(permissionIds: number[]): Promise<void> {
  const permissions = await permissionRepository.findByIds(permissionIds);
  if (permissions.length !== permissionIds.length) {
    throw new ValidationError('One or more permissions are invalid');
  }
}

export const roleService = {
  async list() {
    const roles = await roleRepository.findAll();
    return roles.map((role) => toPublicRole(role));
  },

  async getById(id: number) {
    const role = await roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    return toPublicRole(role);
  },

  async listPermissions() {
    return permissionRepository.findAll();
  },

  async create(input: CreateRoleInput, actorId: number) {
    if (await roleRepository.existsByCode(input.code)) {
      throw new ConflictError('Role code already exists');
    }

    if (await roleRepository.existsByName(input.name)) {
      throw new ConflictError('Role name already exists');
    }

    await assertValidPermissions(input.permissionIds);

    const role = await roleRepository.create({
      code: input.code,
      name: input.name,
      description: input.description,
      isActive: input.isActive,
      createdById: actorId,
      permissionIds: input.permissionIds,
    });

    return toPublicRole(role);
  },

  async update(id: number, input: UpdateRoleInput) {
    const existing = await roleRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    if (existing.isSystem && input.isActive === false) {
      throw new ForbiddenError('System roles cannot be deactivated');
    }

    if (input.name && (await roleRepository.existsByName(input.name, id))) {
      throw new ConflictError('Role name already exists');
    }

    if (input.permissionIds) {
      await assertValidPermissions(input.permissionIds);
    }

    const updated = await roleRepository.update(id, input);
    if (!updated) {
      throw new NotFoundError('Role not found');
    }

    return toPublicRole(updated);
  },

  async remove(id: number) {
    const existing = await roleRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Role not found');
    }

    if (existing.isSystem) {
      throw new ForbiddenError('System roles cannot be deleted');
    }

    const assignedUsers = await roleRepository.countUsers(id);
    if (assignedUsers > 0) {
      throw new ConflictError('Role is assigned to users and cannot be deleted');
    }

    const deleted = await roleRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Role not found');
    }
  },
};
