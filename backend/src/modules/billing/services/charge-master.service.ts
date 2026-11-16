import { AppDataSource } from '../../../config/data-source.js';
import { ChargeMaster } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import type { ChargeInput, UpdateChargeInput } from '../validators/billing.validators.js';

function duplicateCode(error: unknown): never {
  if (error && typeof error === 'object' && 'driverError' in error && error.driverError && typeof error.driverError === 'object' && 'code' in error.driverError && error.driverError.code === 'ER_DUP_ENTRY') throw new ConflictError('Charge code already exists');
  throw error;
}

export const chargeMasterService = {
  list() { return AppDataSource.getRepository(ChargeMaster).find({ order: { category: 'ASC', name: 'ASC' } }); },
  async create(input: ChargeInput) {
    const repo = AppDataSource.getRepository(ChargeMaster);
    const code = input.code.toUpperCase();
    if (await repo.exist({ where: { code } })) throw new ConflictError('Charge code already exists');
    try { return await repo.save(repo.create({ ...input, code, unitPrice: input.unitPrice.toFixed(2) })); }
    catch (error) { return duplicateCode(error); }
  },
  async update(id: number, input: UpdateChargeInput) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(ChargeMaster);
      const charge = await repo.createQueryBuilder('charge').setLock('pessimistic_write').where('charge.id = :id', { id }).getOne();
      if (!charge) throw new NotFoundError('Charge not found');
      if (input.code) {
        const code = input.code.toUpperCase();
        if (code !== charge.code && await repo.exist({ where: { code } })) throw new ConflictError('Charge code already exists');
        charge.code = code;
      }
      if (input.name !== undefined) charge.name = input.name;
      if (input.category !== undefined) charge.category = input.category;
      if (input.unitPrice !== undefined) charge.unitPrice = input.unitPrice.toFixed(2);
      if (input.isActive !== undefined) charge.isActive = input.isActive;
      try { return await repo.save(charge); }
      catch (error) { return duplicateCode(error); }
    });
  },
};
