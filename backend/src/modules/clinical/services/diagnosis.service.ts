import { AppDataSource } from '../../../config/data-source.js';
import { DiagnosisTerm } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import type { CreateDiagnosisTermInput } from '../validators/clinical.validators.js';

export const diagnosisService = {
  async list(search: string) {
    const query = AppDataSource.getRepository(DiagnosisTerm).createQueryBuilder('term').where('term.is_active = :active', { active: true });
    if (search) {
      const escaped = search.replace(/[\\%_]/g, '\\$&');
      query.andWhere("(term.code LIKE :search OR term.name LIKE :search)", { search: `%${escaped}%` });
    }
    return query.orderBy('term.name', 'ASC').addOrderBy('term.code', 'ASC').limit(100).getMany();
  },
  async create(input: CreateDiagnosisTermInput) {
    const repository = AppDataSource.getRepository(DiagnosisTerm);
    const duplicate = await repository.findOne({ where: { system: input.system, code: input.code, version: input.version ?? '' } });
    if (duplicate) throw new ConflictError('This diagnosis code and version already exist');
    try {
      return await repository.save(repository.create({ ...input, version: input.version ?? '', isActive: true }));
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === 'ER_DUP_ENTRY') throw new ConflictError('This diagnosis code and version already exist');
      throw error;
    }
  },
  async deactivate(id: number) {
    const repository = AppDataSource.getRepository(DiagnosisTerm);
    const term = await repository.findOne({ where: { id } });
    if (!term) throw new NotFoundError('Diagnosis term not found');
    if (!term.isActive) throw new ConflictError('Diagnosis term is already inactive');
    term.isActive = false;
    return repository.save(term);
  },
};
