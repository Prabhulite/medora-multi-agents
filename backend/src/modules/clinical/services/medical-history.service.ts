import { AppDataSource } from '../../../config/data-source.js';
import { Patient, PatientAuditLog, PatientMedicalHistory } from '../../../database/entities/index.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import type { CreateMedicalHistoryInput } from '../validators/clinical.validators.js';

export const medicalHistoryService = {
  async list(patientId: number) {
    if (!await AppDataSource.getRepository(Patient).exist({ where: { id: patientId, isActive: true } })) throw new NotFoundError('Patient not found');
    return AppDataSource.getRepository(PatientMedicalHistory).find({ where: { patientId }, order: { createdAt: 'DESC' } });
  },
  async create(patientId: number, input: CreateMedicalHistoryInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :patientId', { patientId }).getOne();
      if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      const record = await manager.getRepository(PatientMedicalHistory).save(manager.getRepository(PatientMedicalHistory).create({ patientId, conditionName: input.conditionName, diagnosedOn: input.diagnosedOn ?? null, notes: input.notes ?? null }));
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'history_added', changedById: userId, changeSummary: `Medical history recorded: ${record.conditionName}`, beforeData: null, afterData: JSON.stringify({ id: record.id, conditionName: record.conditionName, diagnosedOn: record.diagnosedOn, notes: record.notes }) }));
      return record;
    });
  },
  async remove(patientId: number, recordId: number, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const record = await manager.getRepository(PatientMedicalHistory).findOne({ where: { id: recordId, patientId } });
      if (!record) throw new NotFoundError('Medical history record not found');
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'history_removed', changedById: userId, changeSummary: `Medical history removed: ${record.conditionName}`, beforeData: JSON.stringify({ id: record.id, conditionName: record.conditionName, diagnosedOn: record.diagnosedOn, notes: record.notes }), afterData: null }));
      await manager.getRepository(PatientMedicalHistory).remove(record);
      return null;
    });
  },
};
