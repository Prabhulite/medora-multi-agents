import { AppDataSource } from '../../../config/data-source.js';
import { CashDeposit, CashierCloseout } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import type { DepositInput } from '../validators/billing.validators.js';

const cents = (value: string) => {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};
const view = (row: CashDeposit) => ({ id: row.id, closeoutId: row.closeoutId, cashierName: row.closeout.cashier.fullName, businessDate: row.closeout.businessDate, depositDate: row.depositDate, amount: row.amount, bankReference: row.bankReference, note: row.note, recordedByName: row.recordedBy.fullName, recordedAt: row.recordedAt, voidedAt: row.voidedAt, voidedByName: row.voidedBy?.fullName ?? null, voidReason: row.voidReason });

export const cashDepositService = {
  async list(date: string) {
    const rows = await AppDataSource.getRepository(CashDeposit).createQueryBuilder('deposit')
      .innerJoinAndSelect('deposit.closeout', 'closeout').innerJoinAndSelect('closeout.cashier', 'cashier')
      .innerJoinAndSelect('deposit.recordedBy', 'recorder')
      .leftJoinAndSelect('deposit.voidedBy', 'voider')
      .where('closeout.business_date = :date', { date })
      .orderBy('deposit.recorded_at', 'ASC').addOrderBy('deposit.id', 'ASC').getMany();
    return rows.map(view);
  },
  async create(closeoutId: number, input: DepositInput, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const closeout = await manager.getRepository(CashierCloseout).createQueryBuilder('closeout')
        .setLock('pessimistic_write').where('closeout.id = :closeoutId', { closeoutId }).getOne();
      if (!closeout) throw new NotFoundError('Cash closeout not found');
      const [clock] = await manager.query("SELECT DATE_FORMAT(CURRENT_DATE(), '%Y-%m-%d') AS today");
      if (input.depositDate < closeout.businessDate || input.depositDate > clock.today) throw new ValidationError('Deposit date must be between the closeout date and today');
      const repo = manager.getRepository(CashDeposit);
      if (await repo.exist({ where: { closeoutId, bankReference: input.bankReference } })) throw new ConflictError('Bank reference already recorded for this closeout');
      const [posted] = await manager.query('SELECT COALESCE(SUM(amount), 0) AS total FROM cash_deposits WHERE closeout_id = ? AND voided_at IS NULL', [closeoutId]);
      const available = cents(closeout.countedCash) - cents(String(posted.total));
      if (cents(input.amount.toFixed(2)) > available) throw new ValidationError('Deposit exceeds remaining counted cash');
      const saved = await repo.save(repo.create({ closeoutId, depositDate: input.depositDate, amount: input.amount.toFixed(2), bankReference: input.bankReference, note: input.note ?? null, recordedById: userId }));
      const row = await repo.findOne({ where: { id: saved.id }, relations: { closeout: { cashier: true }, recordedBy: true } });
      return view(row!);
    });
  },
  async void(id: number, reason: string, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const deposit = await manager.getRepository(CashDeposit).findOne({ where: { id } });
      if (!deposit) throw new NotFoundError('Cash deposit not found');
      await manager.getRepository(CashierCloseout).createQueryBuilder('closeout').setLock('pessimistic_write').where('closeout.id = :id', { id: deposit.closeoutId }).getOneOrFail();
      const locked = await manager.getRepository(CashDeposit).findOneOrFail({ where: { id } });
      if (locked.voidedAt) throw new ConflictError('Cash deposit is already voided');
      locked.voidedAt = new Date(); locked.voidedById = userId; locked.voidReason = reason;
      await manager.getRepository(CashDeposit).save(locked);
      const row = await manager.getRepository(CashDeposit).findOneOrFail({ where: { id }, relations: { closeout: { cashier: true }, recordedBy: true, voidedBy: true } });
      return view(row);
    });
  },
};
