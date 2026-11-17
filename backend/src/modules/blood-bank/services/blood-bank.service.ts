import { AppDataSource } from '../../../config/data-source.js';
import { BloodUnit, BloodUnitEvent, Patient } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import type { DiscardUnitInput, IssueUnitInput, ReceiveUnitInput, ReleaseUnitInput, UnitListQuery } from '../validators/blood-bank.validators.js';

const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const bloodBankService = {
  async list(query: UnitListQuery) {
    const builder = AppDataSource.getRepository(BloodUnit).createQueryBuilder('unit');
    if (query.status) builder.andWhere('unit.status = :status', { status: query.status });
    if (query.search) builder.andWhere('unit.unit_number LIKE :search', { search: `%${query.search.replace(/[%_\\]/g, '\\$&')}%` });
    if (query.beforeId) builder.andWhere('unit.id < :beforeId', { beforeId: query.beforeId });
    const units = await builder.orderBy('unit.id', 'DESC').take(101).getMany();
    const page = units.slice(0, 100);
    return { items: page.map((unit) => ({ ...unit, expired: unit.expiresOn < today() })), nextCursor: units.length > 100 ? page[page.length - 1].id : null };
  },
  async events(id: number) {
    if (!await AppDataSource.getRepository(BloodUnit).exist({ where: { id } })) throw new NotFoundError('Blood unit not found');
    return AppDataSource.getRepository(BloodUnitEvent).find({ where: { unitId: id }, order: { id: 'ASC' } });
  },
  async patients(search: string) {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const rows = await AppDataSource.getRepository(Patient).createQueryBuilder('patient')
      .select(['patient.id', 'patient.mrdNumber', 'patient.firstName', 'patient.middleName', 'patient.lastName'])
      .where('patient.is_active = 1 AND patient.merged_into_patient_id IS NULL')
      .andWhere('(patient.mrd_number LIKE :term OR patient.first_name LIKE :term OR patient.last_name LIKE :term)', { term: `%${escaped}%` })
      .orderBy('patient.id', 'DESC').take(10).getMany();
    return rows.map((patient) => ({ id: patient.id, mrdNumber: patient.mrdNumber, fullName: [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ') }));
  },
  async receive(input: ReceiveUnitInput, actorId: number) {
    if (input.expiresOn < today()) throw new ValidationError('Expired unit cannot be received');
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(BloodUnit);
      if (await repo.exist({ where: { unitNumber: input.unitNumber } })) throw new ConflictError('Unit number already exists');
      let unit: BloodUnit;
      try { unit = await repo.save(repo.create({ ...input, status: 'quarantined' })); }
      catch (error) { if (error && typeof error === 'object' && 'driverError' in error) throw new ConflictError('Unit number already exists'); throw error; }
      await manager.getRepository(BloodUnitEvent).save({ unitId: unit.id, fromStatus: null, toStatus: 'quarantined', reference: 'Received', actorId });
      return unit;
    });
  },
  async release(id: number, input: ReleaseUnitInput, actorId: number) {
    return AppDataSource.transaction(async (manager) => {
      const unit = await manager.getRepository(BloodUnit).createQueryBuilder('unit').setLock('pessimistic_write').where('unit.id = :id', { id }).getOne();
      if (!unit) throw new NotFoundError('Blood unit not found');
      if (unit.status !== 'quarantined') throw new ConflictError('Only quarantined units can be released');
      if (unit.expiresOn < today()) throw new ConflictError('Expired unit cannot be released');
      unit.status = 'available'; unit.screeningReference = input.screeningReference;
      await manager.getRepository(BloodUnit).save(unit);
      await manager.getRepository(BloodUnitEvent).save({ unitId: id, fromStatus: 'quarantined', toStatus: 'available', reference: input.screeningReference, actorId });
      return unit;
    });
  },
  async issue(id: number, input: IssueUnitInput, actorId: number) {
    return AppDataSource.transaction(async (manager) => {
      const unit = await manager.getRepository(BloodUnit).createQueryBuilder('unit').setLock('pessimistic_write').where('unit.id = :id', { id }).getOne();
      if (!unit) throw new NotFoundError('Blood unit not found');
      if (unit.status !== 'available' || !unit.screeningReference) throw new ConflictError('Unit is not released for issue');
      if (unit.expiresOn < today()) throw new ConflictError('Expired unit cannot be issued');
      const patient = await manager.getRepository(Patient).findOne({ where: { id: input.patientId } });
      if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      unit.status = 'issued'; unit.issuedPatientId = patient.id; unit.crossmatchReference = input.crossmatchReference;
      await manager.getRepository(BloodUnit).save(unit);
      await manager.getRepository(BloodUnitEvent).save({ unitId: id, fromStatus: 'available', toStatus: 'issued', reference: input.crossmatchReference, actorId });
      return unit;
    });
  },
  async discard(id: number, input: DiscardUnitInput, actorId: number) {
    return AppDataSource.transaction(async (manager) => {
      const unit = await manager.getRepository(BloodUnit).createQueryBuilder('unit').setLock('pessimistic_write').where('unit.id = :id', { id }).getOne();
      if (!unit) throw new NotFoundError('Blood unit not found');
      if (unit.status !== 'quarantined' && unit.status !== 'available') throw new ConflictError('Unit cannot be discarded from its current state');
      const prior = unit.status; unit.status = 'discarded';
      await manager.getRepository(BloodUnit).save(unit);
      await manager.getRepository(BloodUnitEvent).save({ unitId: id, fromStatus: prior, toStatus: 'discarded', reference: input.reason, actorId });
      return unit;
    });
  },
};
