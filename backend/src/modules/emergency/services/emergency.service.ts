import { AppDataSource } from '../../../config/data-source.js';
import { Admission, EmergencyCase, Patient } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateEmergencyCaseInput, UpdateEmergencyStatusInput } from '../validators/emergency.validators.js';

const relations = { patient: true, triagedBy: true, updatedBy: true } as const;

export const emergencyService = {
  list(filters: { status?: EmergencyCase['status']; patientId?: number }) {
    return AppDataSource.getRepository(EmergencyCase).find({ where: { ...(filters.status ? { status: filters.status } : {}), ...(filters.patientId ? { patientId: filters.patientId } : {}) }, relations, order: { triagedAt: 'DESC' }, take: 500 });
  },
  async create(input: CreateEmergencyCaseInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :id', { id: input.patientId }).getOne();
      if (!patient || !patient.isActive) throw new NotFoundError('Active patient not found');
      const current = await manager.getRepository(EmergencyCase).createQueryBuilder('emergency').where('emergency.patient_id = :patientId', { patientId: patient.id }).andWhere('emergency.status IN (:...statuses)', { statuses: ['waiting', 'in_care'] }).getOne();
      if (current) throw new ConflictError('Patient already has an active emergency case');
      const caseRecord = await manager.getRepository(EmergencyCase).save(manager.getRepository(EmergencyCase).create({ caseNumber: await nextSequenceNumber(manager, 'ER', 'ER', 6), patientId: patient.id, triageCategory: input.triageCategory, chiefComplaint: input.chiefComplaint, pulseBpm: input.pulseBpm ?? null, systolicBp: input.systolicBp ?? null, diastolicBp: input.diastolicBp ?? null, spo2Percent: input.spo2Percent ?? null, status: 'waiting', triagedAt: new Date(), triagedById: userId, dispositionAt: null, dispositionNote: null, updatedById: null }));
      return manager.getRepository(EmergencyCase).findOne({ where: { id: caseRecord.id }, relations });
    });
  },
  async updateStatus(id: number, input: UpdateEmergencyStatusInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(EmergencyCase);
      const caseRecord = await repo.createQueryBuilder('emergency').setLock('pessimistic_write').where('emergency.id = :id', { id }).getOne();
      if (!caseRecord) throw new NotFoundError('Emergency case not found');
      if (caseRecord.status === 'admitted' || caseRecord.status === 'discharged') throw new ConflictError('Emergency case is already closed');
      if (input.status === 'in_care' && caseRecord.status !== 'waiting') throw new ConflictError('Patient is already in care');
      if (input.status !== 'in_care' && caseRecord.status !== 'in_care') throw new ConflictError('Start care before recording disposition');
      if (input.status === 'admitted') {
        const admission = await manager.getRepository(Admission).createQueryBuilder('admission').where('admission.patient_id = :patientId', { patientId: caseRecord.patientId }).andWhere('admission.status <> :discharged', { discharged: 'discharged' }).getOne();
        if (!admission) throw new ConflictError('Create an active inpatient admission before marking emergency case admitted');
      }
      caseRecord.status = input.status;
      caseRecord.updatedById = userId;
      if (input.status !== 'in_care') { caseRecord.dispositionAt = new Date(); caseRecord.dispositionNote = input.dispositionNote ?? null; }
      await repo.save(caseRecord);
      return repo.findOne({ where: { id }, relations });
    });
  },
};
