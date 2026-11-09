import { Not } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Menu } from '../../../database/entities/index.js';

export interface MenuView {
  id: number;
  code: string;
  label: string;
  route: string;
  icon: string;
  permissionCode: string | null;
  parentId: number | null;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMenuRecord {
  code: string;
  label: string;
  route: string;
  icon: string;
  permissionCode: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  isSystem?: boolean;
}

export interface UpdateMenuRecord {
  label?: string;
  route?: string;
  icon?: string;
  permissionCode?: string | null;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

function toMenuView(menu: Menu): MenuView {
  return {
    id: menu.id,
    code: menu.code,
    label: menu.label,
    route: menu.route,
    icon: menu.icon,
    permissionCode: menu.permissionCode,
    parentId: menu.parentId,
    sortOrder: menu.sortOrder,
    isSystem: menu.isSystem,
    isActive: menu.isActive,
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
  };
}

export const menuRepository = {
  repo() {
    return AppDataSource.getRepository(Menu);
  },

  async findAll(): Promise<MenuView[]> {
    const menus = await this.repo().find({
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
    return menus.map(toMenuView);
  },

  async findActiveNav(): Promise<MenuView[]> {
    const menus = await this.repo().find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
    return menus.map(toMenuView);
  },

  async findById(id: number): Promise<MenuView | null> {
    const menu = await this.repo().findOne({ where: { id } });
    return menu ? toMenuView(menu) : null;
  },

  async create(input: CreateMenuRecord): Promise<MenuView> {
    const menu = this.repo().create({
      code: input.code,
      label: input.label,
      route: input.route,
      icon: input.icon,
      permissionCode: input.permissionCode,
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      isSystem: input.isSystem ?? false,
    });
    const saved = await this.repo().save(menu);
    return this.findById(saved.id) as Promise<MenuView>;
  },

  async update(id: number, input: UpdateMenuRecord): Promise<MenuView | null> {
    const menu = await this.repo().findOne({ where: { id } });
    if (!menu) return null;

    if (input.label !== undefined) menu.label = input.label;
    if (input.route !== undefined) menu.route = input.route;
    if (input.icon !== undefined) menu.icon = input.icon;
    if (input.permissionCode !== undefined) menu.permissionCode = input.permissionCode;
    if (input.parentId !== undefined) menu.parentId = input.parentId;
    if (input.sortOrder !== undefined) menu.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) menu.isActive = input.isActive;

    await this.repo().save(menu);
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

  async existsByRoute(route: string, excludeId?: number): Promise<boolean> {
    const count = await this.repo().count({
      where: excludeId ? { route, id: Not(excludeId) } : { route },
    });
    return count > 0;
  },
};
