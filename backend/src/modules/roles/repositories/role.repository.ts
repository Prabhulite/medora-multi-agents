import { In, Not } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Permission, Role } from '../../../database/entities/index.js';

export interface RoleView {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdById: number | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissionIds: number[];
  permissionCodes: string[];
}

export interface CreateRoleInput {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdById?: number | null;
  permissionIds: number[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  permissionIds?: number[];
}

function toRoleView(role: Role): RoleView {
  const permissions = role.permissions ?? [];
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    createdById: role.createdById,
    createdByName: role.createdBy?.fullName ?? null,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissionIds: permissions.map((permission) => permission.id),
    permissionCodes: permissions.map((permission) => permission.code),
  };
}

export const roleRepository = {
  repo() {
    return AppDataSource.getRepository(Role);
  },

  permissionRepo() {
    return AppDataSource.getRepository(Permission);
  },

  async findAll(): Promise<RoleView[]> {
    const roles = await this.repo().find({
      relations: { permissions: true, createdBy: true },
      order: { name: 'ASC' },
    });
    return roles.map(toRoleView);
  },

  async findById(id: number): Promise<RoleView | null> {
    const role = await this.repo().findOne({
      where: { id },
      relations: { permissions: true, createdBy: true },
    });
    return role ? toRoleView(role) : null;
  },

  async findActiveByIds(ids: number[]): Promise<RoleView[]> {
    if (ids.length === 0) return [];
    const roles = await this.repo().find({
      where: { id: In(ids), isActive: true },
      relations: { permissions: true, createdBy: true },
    });
    return roles.map(toRoleView);
  },

  async create(input: CreateRoleInput): Promise<RoleView> {
    const permissions = await this.permissionRepo().findBy({
      id: In(input.permissionIds),
    });

    const role = this.repo().create({
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      isActive: input.isActive,
      createdById: input.createdById ?? null,
      isSystem: false,
      permissions,
    });

    const saved = await this.repo().save(role);
    return this.findById(saved.id) as Promise<RoleView>;
  },

  async update(id: number, input: UpdateRoleInput): Promise<RoleView | null> {
    const role = await this.repo().findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) return null;

    if (input.name !== undefined) role.name = input.name;
    if (input.description !== undefined) role.description = input.description;
    if (input.isActive !== undefined) role.isActive = input.isActive;

    if (input.permissionIds !== undefined) {
      role.permissions = await this.permissionRepo().findBy({
        id: In(input.permissionIds),
      });
    }

    await this.repo().save(role);
    return this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const result = await this.repo().delete({ id, isSystem: false });
    return (result.affected ?? 0) > 0;
  },

  async existsByCode(code: string, excludeId?: number): Promise<boolean> {
    const count = await this.repo().count({
      where: excludeId ? { code, id: Not(excludeId) } : { code },
    });
    return count > 0;
  },

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const count = await this.repo().count({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
    return count > 0;
  },

  async countUsers(roleId: number): Promise<number> {
    return AppDataSource.getRepository(Role)
      .createQueryBuilder('role')
      .innerJoin('role.users', 'user')
      .where('role.id = :roleId', { roleId })
      .getCount();
  },
};
