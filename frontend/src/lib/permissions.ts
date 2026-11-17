import type { AuthUser } from '../types';

function isAdminUser(user: AuthUser): boolean {
  return Boolean(user.isSuperAdmin) || (user.roleCodes ?? []).includes('super_admin');
}

export function hasPermission(user: AuthUser | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return (user.permissions ?? []).includes(permission);
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return permissions.some((permission) => (user.permissions ?? []).includes(permission));
}
