import { In, Not } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Role, User, type UserGender } from '../../../database/entities/index.js';

export interface UserView {
  id: number;
  employeeId: string | null;
  username: string;
  email: string | null;
  fullName: string;
  mobileNumber: string | null;
  gender: UserGender;
  designation: string | null;
  departmentId: number | null;
  departmentName: string | null;
  departmentCode: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: Date | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string;
  roleIds: number[];
  roleCodes: string[];
  roleNames: string[];
}

export interface AuthContextRecord {
  id: number;
  sessionVersion: number;
  username: string;
  email: string | null;
  fullName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  roleIds: number[];
  roleCodes: string[];
  permissions: string[];
}

export interface CreateUserRepoInput {
  employeeId: string;
  username: string;
  email: string | null;
  passwordHash: string;
  fullName: string;
  mobileNumber: string;
  gender: UserGender;
  designation: string | null;
  departmentId: number;
  isActive: boolean;
  createdById?: number | null;
  roleIds: number[];
}

export interface UpdateUserRepoInput {
  employeeId?: string;
  email?: string | null;
  fullName?: string;
  mobileNumber?: string;
  gender?: UserGender;
  designation?: string | null;
  departmentId?: number | null;
  isActive?: boolean;
  passwordHash?: string;
  roleIds?: number[];
}

function toUserView(user: User, includePassword = false): UserView {
  const roles = user.roles ?? [];
  return {
    id: user.id,
    employeeId: user.employeeId,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    mobileNumber: user.mobileNumber,
    gender: user.gender,
    designation: user.designation,
    departmentId: user.departmentId,
    departmentName: user.department?.name ?? null,
    departmentCode: user.department?.code ?? null,
    isActive: user.isActive,
    isSuperAdmin: user.isSuperAdmin,
    lastLoginAt: user.lastLoginAt,
    createdById: user.createdById,
    createdByName: user.createdBy?.fullName ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    passwordHash: includePassword ? user.passwordHash : undefined,
    roleIds: roles.map((role) => role.id),
    roleCodes: roles.map((role) => role.code),
    roleNames: roles.map((role) => role.name),
  };
}

export const userRepository = {
  repo() {
    return AppDataSource.getRepository(User);
  },

  roleRepo() {
    return AppDataSource.getRepository(Role);
  },

  async findAll(): Promise<UserView[]> {
    const users = await this.repo().find({
      relations: { roles: true, department: true, createdBy: true },
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => toUserView(user));
  },

  async findById(id: number): Promise<UserView | null> {
    const user = await this.repo().findOne({
      where: { id },
      relations: { roles: true, department: true, createdBy: true },
    });
    return user ? toUserView(user) : null;
  },

  async findByUsername(username: string): Promise<UserView | null> {
    const user = await this.repo().findOne({
      where: { username },
      relations: { roles: true, department: true, createdBy: true },
    });
    return user ? toUserView(user, true) : null;
  },

  async findAuthContextById(id: number): Promise<AuthContextRecord | null> {
    const user = await this.repo().findOne({
      where: { id },
      relations: {
        roles: {
          permissions: true,
        },
      },
    });

    if (!user) return null;

    const activeRoles = (user.roles ?? []).filter((role) => role.isActive);
    const permissionSet = new Set<string>();

    for (const role of activeRoles) {
      for (const permission of role.permissions ?? []) {
        permissionSet.add(permission.code);
      }
    }

    return {
      id: user.id,
      sessionVersion: user.sessionVersion,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      isSuperAdmin: user.isSuperAdmin,
      roleIds: activeRoles.map((role) => role.id),
      roleCodes: activeRoles.map((role) => role.code),
      permissions: [...permissionSet],
    };
  },

  async create(input: CreateUserRepoInput): Promise<UserView> {
    const roles = await this.roleRepo().findBy({ id: In(input.roleIds) });

    const user = this.repo().create({
      employeeId: input.employeeId,
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      mobileNumber: input.mobileNumber,
      gender: input.gender,
      designation: input.designation,
      departmentId: input.departmentId,
      isActive: input.isActive,
      createdById: input.createdById ?? null,
      isSuperAdmin: false,
      roles,
    });

    const saved = await this.repo().save(user);
    return this.findById(saved.id) as Promise<UserView>;
  },

  async update(id: number, input: UpdateUserRepoInput): Promise<UserView | null> {
    const user = await this.repo().findOne({
      where: { id },
      relations: { roles: true, department: true },
    });
    if (!user) return null;

    if (input.employeeId !== undefined) user.employeeId = input.employeeId;
    if (input.email !== undefined) user.email = input.email;
    if (input.fullName !== undefined) user.fullName = input.fullName;
    if (input.mobileNumber !== undefined) user.mobileNumber = input.mobileNumber;
    if (input.gender !== undefined) user.gender = input.gender;
    if (input.designation !== undefined) user.designation = input.designation;
    if (input.departmentId !== undefined) user.departmentId = input.departmentId;
    if (input.isActive !== undefined) user.isActive = input.isActive;
    if (input.passwordHash !== undefined) { user.passwordHash = input.passwordHash; user.sessionVersion += 1; }

    if (input.roleIds !== undefined) {
      user.roles = await this.roleRepo().findBy({ id: In(input.roleIds) });
    }

    await this.repo().save(user);
    return this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const result = await this.repo().delete({ id, isSuperAdmin: false });
    return (result.affected ?? 0) > 0;
  },

  async touchLastLogin(id: number): Promise<void> {
    await this.repo().update({ id }, { lastLoginAt: new Date() });
  },

  async existsByUsername(username: string, excludeId?: number): Promise<boolean> {
    const count = await this.repo().count({
      where: excludeId ? { username, id: Not(excludeId) } : { username },
    });
    return count > 0;
  },

  async existsByEmail(email: string, excludeId?: number): Promise<boolean> {
    const count = await this.repo().count({
      where: excludeId ? { email, id: Not(excludeId) } : { email },
    });
    return count > 0;
  },

  async existsByEmployeeId(employeeId: string, excludeId?: number): Promise<boolean> {
    const count = await this.repo().count({
      where: excludeId ? { employeeId, id: Not(excludeId) } : { employeeId },
    });
    return count > 0;
  },
};
