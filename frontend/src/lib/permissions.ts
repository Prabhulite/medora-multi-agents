import type { AuthUser } from '../types';

export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return permissions.some((permission) => user.permissions.includes(permission));
}
