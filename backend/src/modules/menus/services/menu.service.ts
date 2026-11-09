import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/AppError.js';
import type { AuthUser } from '../../../shared/types/auth.js';
import { permissionRepository } from '../../permissions/repositories/permission.repository.js';
import { menuRepository } from '../repositories/menu.repository.js';
import type { CreateMenuInput, UpdateMenuInput } from '../validators/menu.validators.js';

async function assertPermissionCode(permissionCode: string | null | undefined): Promise<void> {
  if (!permissionCode) return;
  const permissions = await permissionRepository.findAll();
  if (!permissions.some((permission) => permission.code === permissionCode)) {
    throw new ValidationError('Permission code is invalid');
  }
}

export const menuService = {
  async list() {
    return menuRepository.findAll();
  },

  async listNav(user: AuthUser) {
    const menus = await menuRepository.findActiveNav();

    const permitted = user.isSuperAdmin
      ? menus
      : menus.filter((menu) => {
          if (!menu.permissionCode) return true;
          return (user.permissions ?? []).includes(menu.permissionCode);
        });

    const permittedIds = new Set(permitted.map((menu) => menu.id));
    const parentIdsWithVisibleChildren = new Set(
      permitted
        .filter((menu) => menu.parentId && permittedIds.has(menu.parentId))
        .map((menu) => menu.parentId as number),
    );

    return permitted.filter((menu) => {
      const hasVisibleChildren = permitted.some((child) => child.parentId === menu.id);
      if (hasVisibleChildren) return true;

      const isParentMenu = menus.some((child) => child.parentId === menu.id);
      if (isParentMenu) return false;

      if (menu.parentId) return parentIdsWithVisibleChildren.has(menu.parentId);
      return true;
    });
  },

  async getById(id: number) {
    const menu = await menuRepository.findById(id);
    if (!menu) {
      throw new NotFoundError('Menu not found');
    }
    return menu;
  },

  async create(input: CreateMenuInput) {
    if (await menuRepository.existsByCode(input.code)) {
      throw new ConflictError('Menu code already exists');
    }

    if (await menuRepository.existsByRoute(input.route)) {
      throw new ConflictError('Menu route already exists');
    }

    await assertPermissionCode(input.permissionCode);

    if (input.parentId) {
      const parent = await menuRepository.findById(input.parentId);
      if (!parent) {
        throw new ValidationError('Parent menu is invalid');
      }
    }

    return menuRepository.create({
      code: input.code,
      label: input.label,
      route: input.route,
      icon: input.icon,
      permissionCode: input.permissionCode ?? null,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });
  },

  async update(id: number, input: UpdateMenuInput) {
    const existing = await menuRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Menu not found');
    }

    if (existing.isSystem && input.isActive === false) {
      throw new ForbiddenError('System menus cannot be deactivated');
    }

    if (input.route && (await menuRepository.existsByRoute(input.route, id))) {
      throw new ConflictError('Menu route already exists');
    }

    if (input.permissionCode !== undefined) {
      await assertPermissionCode(input.permissionCode);
    }

    if (input.parentId) {
      if (input.parentId === id) {
        throw new ValidationError('Menu cannot be its own parent');
      }
      const parent = await menuRepository.findById(input.parentId);
      if (!parent) {
        throw new ValidationError('Parent menu is invalid');
      }
    }

    const updated = await menuRepository.update(id, {
      label: input.label,
      route: input.route,
      icon: input.icon,
      permissionCode: input.permissionCode,
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    });

    if (!updated) {
      throw new NotFoundError('Menu not found');
    }

    return updated;
  },

  async remove(id: number) {
    const existing = await menuRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Menu not found');
    }

    if (existing.isSystem) {
      throw new ForbiddenError('System menus cannot be deleted');
    }

    const deleted = await menuRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Menu not found');
    }
  },
};
