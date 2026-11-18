import { AppDataSource } from '../../../config/data-source.js';
import { RegistrationSource, RegistrationSourceEvent } from '../../../database/entities/index.js';
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

  async history(id: number) {
    const source = await AppDataSource.getRepository(RegistrationSource).findOne({ where: { id } });
    if (!source) throw new NotFoundError('Registration source not found');
    const rows = await AppDataSource.getRepository(RegistrationSourceEvent).find({
      where: { sourceId: id }, relations: { actor: true }, order: { createdAt: 'DESC', id: 'DESC' }, take: 100,
    });
    return rows.map((row) => ({
      id: row.id, action: row.action, beforeName: row.beforeName, afterName: row.afterName,
      beforeActive: row.beforeActive, afterActive: row.afterActive,
      actorName: row.actor?.fullName ?? null, createdAt: row.createdAt,
    }));
  },

  async create(input: { code: string; name: string }, actorId: number | null) {
    try {
      return await AppDataSource.transaction(async (manager) => {
        const repo = manager.getRepository(RegistrationSource);
        const source = await repo.save(repo.create({ code: input.code, name: input.name, isActive: true }));
        await manager.getRepository(RegistrationSourceEvent).save({
          sourceId: source.id, action: 'created', beforeName: null, afterName: source.name,
          beforeActive: null, afterActive: true, actorId,
        });
        return source;
      });
    } catch (error) {
      rethrowDuplicate(error);
    }
  },

  async update(id: number, input: { name?: string; isActive?: boolean }, actorId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RegistrationSource);
      const source = await repo.createQueryBuilder('source').setLock('pessimistic_write')
        .where('source.id = :id', { id }).getOne();
      if (!source) throw new NotFoundError('Registration source not found');
      const beforeName = source.name;
      const beforeActive = source.isActive;
      if (input.name !== undefined) source.name = input.name;
      if (input.isActive !== undefined) source.isActive = input.isActive;
      if (source.name === beforeName && source.isActive === beforeActive) return source;
      const saved = await repo.save(source);
      const action = source.name !== beforeName && source.isActive !== beforeActive ? 'updated'
        : source.name !== beforeName ? 'renamed' : source.isActive ? 'reactivated' : 'retired';
      await manager.getRepository(RegistrationSourceEvent).save({
        sourceId: source.id, action, beforeName, afterName: source.name,
        beforeActive, afterActive: source.isActive, actorId,
      });
      return saved;
    });
  },
};
