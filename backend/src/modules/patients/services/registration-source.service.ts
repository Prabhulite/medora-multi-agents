import { AppDataSource } from '../../../config/data-source.js';
import { RegistrationSource } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';

function rethrowDuplicate(error: unknown): never {
  if ((error as { driverError?: { code?: string } })?.driverError?.code === 'ER_DUP_ENTRY') {
    throw new ConflictError('Registration source code already exists');
  }
  throw error;
}

export const registrationSourceService = {
  list() {
    return AppDataSource.getRepository(RegistrationSource).find({
      select: { id: true, code: true, name: true, isActive: true },
      order: { name: 'ASC', id: 'ASC' },
    });
  },

  async create(input: { code: string; name: string }) {
    const repo = AppDataSource.getRepository(RegistrationSource);
    try {
      return await repo.save(repo.create({ code: input.code, name: input.name, isActive: true }));
    } catch (error) {
      rethrowDuplicate(error);
    }
  },

  async update(id: number, input: { name?: string; isActive?: boolean }) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RegistrationSource);
      const source = await repo.createQueryBuilder('source').setLock('pessimistic_write')
        .where('source.id = :id', { id }).getOne();
      if (!source) throw new NotFoundError('Registration source not found');
      if (input.name !== undefined) source.name = input.name;
      if (input.isActive !== undefined) source.isActive = input.isActive;
      return repo.save(source);
    });
  },
};
