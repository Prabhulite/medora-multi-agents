import { Not } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Department, User } from '../../../database/entities/index.js';

export interface DepartmentView {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  userCount: number;
}

function toView(department: Department, userCount = 0): DepartmentView {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    isActive: department.isActive,
    createdAt: department.createdAt,
    updatedAt: department.updatedAt,
    userCount,
  };
}

export const departmentRepository = {
  repo() {
    return AppDataSource.getRepository(Department);
  },

  userRepo() {
    return AppDataSource.getRepository(User);
  },

  async findAll(): Promise<DepartmentView[]> {
    const rows = await this.repo().find({
      order: { name: 'ASC' },
    });
    const counts = await this.userRepo()
      .createQueryBuilder('user')
      .select('user.department_id', 'departmentId')
      .addSelect('COUNT(*)', 'count')
      .where('user.department_id IS NOT NULL')
      .groupBy('user.department_id')
      .getRawMany<{ departmentId: number; count: string }>();

    const countMap = new Map(
      counts.map((row) => [Number(row.departmentId), Number(row.count)]),
    );

    return rows.map((row) => toView(row, countMap.get(row.id) ?? 0));
  },

  async findActive(): Promise<DepartmentView[]> {
    const rows = await this.repo().find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return rows.map((row) => toView(row));
  },

  async findById(id: number): Promise<DepartmentView | null> {
    const row = await this.repo().findOne({ where: { id } });
    if (!row) return null;
    const userCount = await this.userRepo().count({ where: { departmentId: id } });
    return toView(row, userCount);
  },

  async findActiveById(id: number): Promise<DepartmentView | null> {
    const row = await this.repo().findOne({ where: { id, isActive: true } });
    return row ? toView(row) : null;
  },

  async create(input: {
    code: string;
    name: string;
    isActive: boolean;
  }): Promise<DepartmentView> {
    const saved = await this.repo().save(
      this.repo().create({
        code: input.code,
        name: input.name,
        isActive: input.isActive,
      }),
    );
    return this.findById(saved.id) as Promise<DepartmentView>;
  },

  async update(
    id: number,
    input: {
      code?: string;
      name?: string;
      isActive?: boolean;
    },
  ): Promise<DepartmentView | null> {
    const row = await this.repo().findOne({ where: { id } });
    if (!row) return null;

    if (input.code !== undefined) row.code = input.code;
    if (input.name !== undefined) row.name = input.name;
    if (input.isActive !== undefined) row.isActive = input.isActive;

    await this.repo().save(row);
    return this.findById(id);
  },

  async delete(id: number): Promise<boolean> {
    const result = await this.repo().delete({ id });
    return (result.affected ?? 0) > 0;
  },

  async countUsers(id: number): Promise<number> {
    return this.userRepo().count({ where: { departmentId: id } });
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
};
