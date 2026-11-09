import bcrypt from 'bcryptjs';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/AppError.js';
import { roleRepository } from '../../roles/repositories/role.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import type { CreateUserInput, UpdateUserInput } from '../validators/user.validators.js';

function toPublicUser(user: Awaited<ReturnType<typeof userRepository.findById>>) {
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
    isSuperAdmin: user.isSuperAdmin,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roleIds: user.roleIds,
    roleCodes: user.roleCodes,
    roleNames: user.roleNames,
  };
}

async function assertValidRoles(roleIds: number[]): Promise<void> {
  const roles = await roleRepository.findActiveByIds(roleIds);
  if (roles.length !== roleIds.length) {
    throw new ValidationError('One or more roles are invalid or inactive');
  }
}

export const userService = {
  async list() {
    const users = await userRepository.findAll();
    return users.map((user) => toPublicUser(user));
  },

  async getById(id: number) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return toPublicUser(user);
  },

  async create(input: CreateUserInput) {
    if (await userRepository.existsByUsername(input.username)) {
      throw new ConflictError('Username already exists');
    }

    if (await userRepository.existsByEmail(input.email)) {
      throw new ConflictError('Email already exists');
    }

    await assertValidRoles(input.roleIds);

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await userRepository.create({
      username: input.username,
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      isActive: input.isActive,
      roleIds: input.roleIds,
    });

    return toPublicUser(user);
  },

  async update(id: number, input: UpdateUserInput, actorId: number) {
    const existing = await userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (existing.isSuperAdmin && input.isActive === false) {
      throw new ForbiddenError('Super admin cannot be deactivated');
    }

    if (existing.isSuperAdmin && input.roleIds) {
      throw new ForbiddenError('Super admin roles cannot be changed from this endpoint');
    }

    if (input.email && (await userRepository.existsByEmail(input.email, id))) {
      throw new ConflictError('Email already exists');
    }

    if (input.roleIds) {
      await assertValidRoles(input.roleIds);
    }

    if (id === actorId && input.isActive === false) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    const passwordHash = input.password
      ? await bcrypt.hash(input.password, 12)
      : undefined;

    const updated = await userRepository.update(id, {
      email: input.email,
      fullName: input.fullName,
      isActive: input.isActive,
      passwordHash,
      roleIds: input.roleIds,
    });

    return toPublicUser(updated);
  },

  async remove(id: number, actorId: number) {
    if (id === actorId) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const existing = await userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    if (existing.isSuperAdmin) {
      throw new ForbiddenError('Super admin cannot be deleted');
    }

    const deleted = await userRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('User not found');
    }
  },
};
