import { Not } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { ServiceCategory, ServiceMaster } from '../../../database/entities/index.js';

export interface ServiceCategoryView {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  serviceCount: number;
  createdAt: Date;
  updatedAt: Date;
}

function toView(row: ServiceCategory, serviceCount = 0): ServiceCategoryView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    serviceCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const serviceCategoryRepository = {
  repo() {
    return AppDataSource.getRepository(ServiceCategory);
  },

  serviceRepo() {
    return AppDataSource.getRepository(ServiceMaster);
  },

  async findAll() {
    const rows = await this.repo().find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    const counts = await this.serviceRepo()
      .createQueryBuilder('service')
      .select('service.category_id', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('service.category_id')
      .getRawMany<{ categoryId: number; count: string }>();
    const map = new Map(counts.map((row) => [Number(row.categoryId), Number(row.count)]));
    return rows.map((row) => toView(row, map.get(row.id) ?? 0));
  },

  async findActive() {
    const rows = await this.repo().find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return rows.map((row) => toView(row));
  },

  async findById(id: number) {
    const row = await this.repo().findOne({ where: { id } });
    if (!row) return null;
    const serviceCount = await this.serviceRepo().count({ where: { categoryId: id } });
    return toView(row, serviceCount);
  },

  async existsByCode(code: string, excludeId?: number) {
    return this.repo().exist({
      where: excludeId ? { code, id: Not(excludeId) } : { code },
    });
  },

  async existsByName(name: string, excludeId?: number) {
    return this.repo().exist({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
  },

  async create(input: {
    code: string;
    name: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
  }) {
    const saved = await this.repo().save(this.repo().create(input));
    return toView(saved);
  },

  async update(
    id: number,
    input: Partial<{
      code: string;
      name: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) {
    const row = await this.repo().findOne({ where: { id } });
    if (!row) return null;
    Object.assign(row, input);
    const saved = await this.repo().save(row);
    const serviceCount = await this.serviceRepo().count({ where: { categoryId: id } });
    return toView(saved, serviceCount);
  },

  async delete(id: number) {
    const result = await this.repo().delete(id);
    return (result.affected ?? 0) > 0;
  },

  async countServices(id: number) {
    return this.serviceRepo().count({ where: { categoryId: id } });
  },
};
