import { Not } from 'typeorm';
import { AppDataSource } from '../../../config/data-source.js';
import { Doctor, Specialization } from '../../../database/entities/index.js';

export interface SpecializationView {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  doctorCount: number;
}

function toView(row: Specialization, doctorCount = 0): SpecializationView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    doctorCount,
  };
}

export const specializationRepository = {
  repo() {
    return AppDataSource.getRepository(Specialization);
  },

  doctorRepo() {
    return AppDataSource.getRepository(Doctor);
  },

  async findAll(): Promise<SpecializationView[]> {
    const rows = await this.repo().find({ order: { name: 'ASC' } });
    const counts = await this.doctorRepo()
      .createQueryBuilder('doctor')
      .select('doctor.specialization_id', 'specializationId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('doctor.specialization_id')
      .getRawMany<{ specializationId: number; count: string }>();

    const countMap = new Map(
      counts.map((row) => [Number(row.specializationId), Number(row.count)]),
    );

    return rows.map((row) => toView(row, countMap.get(row.id) ?? 0));
  },

  async findActive(): Promise<SpecializationView[]> {
    const rows = await this.repo().find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return rows.map((row) => toView(row));
  },

  async findById(id: number): Promise<SpecializationView | null> {
    const row = await this.repo().findOne({ where: { id } });
    if (!row) return null;
    const doctorCount = await this.doctorRepo().count({ where: { specializationId: id } });
    return toView(row, doctorCount);
  },

  async create(input: {
    code: string;
    name: string;
    isActive: boolean;
  }): Promise<SpecializationView> {
    const saved = await this.repo().save(this.repo().create(input));
    return this.findById(saved.id) as Promise<SpecializationView>;
  },

  async update(
    id: number,
    input: { code?: string; name?: string; isActive?: boolean },
  ): Promise<SpecializationView | null> {
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

  async countDoctors(id: number): Promise<number> {
    return this.doctorRepo().count({ where: { specializationId: id } });
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
