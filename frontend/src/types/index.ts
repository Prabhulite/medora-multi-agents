export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roleIds: number[];
  roleCodes: string[];
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  details?: unknown;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roleIds: number[];
  roleCodes: string[];
  roleNames: string[];
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissionIds: number[];
  permissionCodes: string[];
}

export interface Permission {
  id: number;
  code: string;
  module: string;
  action: string;
  description: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface CreateUserPayload {
  username: string;
  email: string;
  fullName: string;
  password: string;
  isActive: boolean;
  roleIds: number[];
}

export interface UpdateUserPayload {
  email?: string;
  fullName?: string;
  password?: string;
  isActive?: boolean;
  roleIds?: number[];
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  permissionIds: number[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
  isActive?: boolean;
  permissionIds?: number[];
}
