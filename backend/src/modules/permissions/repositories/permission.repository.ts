import { In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Permission } from '../../../database/entities/index.js';

export const permissionRepository = {
  repo() {
    return AppDataSource.getRepository(Permission);
  },

  async findAll(): Promise<Permission[]> {
    return this.repo().find({
      order: { module: 'ASC', action: 'ASC' },
    });
  },

  async findByIds(ids: number[]): Promise<Permission[]> {
    if (ids.length === 0) return [];
    return this.repo().findBy({ id: In(ids) });
  },
};
