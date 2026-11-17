import { AppDataSource } from '../../../config/data-source.js';
import { HomeMedication, Patient, PatientAuditLog } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import type { CreateHomeMedicationInput } from '../validators/clinical.validators.js';

const response = (row: HomeMedication) => ({ id: row.id, patientId: row.patientId, medicineName: row.medicineName, dosage: row.dosage, frequency: row.frequency, route: row.route, source: row.source, sourceDetail: row.sourceDetail, isCurrent: row.isCurrent, recordedAt: row.recordedAt, recordedById: row.recordedById, ceasedAt: row.ceasedAt, ceasedById: row.ceasedById, cessationReason: row.cessationReason });

export const homeMedicationService = {
  async list(patientId: number) {
    if (!await AppDataSource.getRepository(Patient).exist({ where: { id: patientId, isActive: true } })) throw new NotFoundError('Patient not found');
    const rows = await AppDataSource.getRepository(HomeMedication).find({ where: { patientId }, order: { isCurrent: 'DESC', recordedAt: 'DESC', id: 'DESC' } });
    return rows.map(response);
  },
  async create(patientId: number, input: CreateHomeMedicationInput, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :patientId', { patientId }).getOne();
      if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      const repo = manager.getRepository(HomeMedication);
      const rows = await repo.find({ where: { patientId, isCurrent: true } });
      const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
      if (rows.some((row) => normalize(row.medicineName) === normalize(input.medicineName))) throw new ConflictError('This home medication is already listed as current');
      const row = await repo.save(repo.create({ patientId, medicineName: input.medicineName, dosage: input.dosage ?? null, frequency: input.frequency ?? null, route: input.route ?? null, source: input.source, sourceDetail: input.sourceDetail ?? null, isCurrent: true, recordedById: userId, ceasedAt: null, ceasedById: null, cessationReason: null }));
      await manager.getRepository(PatientAuditLog).save({ patientId, action: 'home_medication_recorded', changedById: userId, changeSummary: `Home medication history recorded: ${row.medicineName}`, beforeData: null, afterData: JSON.stringify({ homeMedicationId: row.id, source: row.source }) });
      return response(row);
    });
  },
  async cease(patientId: number, id: number, reason: string, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(HomeMedication);
      const row = await repo.createQueryBuilder('home').setLock('pessimistic_write').where('home.id = :id AND home.patient_id = :patientId', { id, patientId }).getOne();
      if (!row) throw new NotFoundError('Home medication not found for this patient');
      if (!row.isCurrent) throw new ConflictError('Home medication is already marked not current');
      row.isCurrent = false; row.ceasedAt = new Date(); row.ceasedById = userId; row.cessationReason = reason;
      await repo.save(row);
      await manager.getRepository(PatientAuditLog).save({ patientId, action: 'home_medication_ceased', changedById: userId, changeSummary: `Home medication history marked not current: ${row.medicineName}`, beforeData: JSON.stringify({ homeMedicationId: id, isCurrent: true }), afterData: JSON.stringify({ homeMedicationId: id, isCurrent: false, reason }) });
      return response(row);
    });
  },
};
