import { AppDataSource } from '../../../config/data-source.js';
import { Patient, PatientAuditLog, PatientCommunication } from '../../../database/entities/index.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { ConflictError } from '../../../shared/errors/AppError.js';
import type { CreateCommunicationInput } from '../validators/communication.validators.js';

export const communicationService = {
  async followUps(status: 'open' | 'overdue') {
    const query = AppDataSource.getRepository(PatientCommunication).createQueryBuilder('communication').innerJoinAndSelect('communication.patient', 'patient').where('communication.followUpDueAt IS NOT NULL').andWhere('communication.followUpCompletedAt IS NULL').andWhere('patient.isActive = 1');
    if (status === 'overdue') query.andWhere('communication.followUpDueAt < :now', { now: new Date() });
    const rows = await query.orderBy('communication.followUpDueAt', 'ASC').take(100).getMany();
    const now = Date.now();
    return rows.map((row) => ({ id: row.id, patientId: row.patientId, patientName: [row.patient.firstName, row.patient.middleName, row.patient.lastName].filter(Boolean).join(' '), patientMrdNumber: row.patient.mrdNumber, channel: row.channel, subject: row.subject, followUpDueAt: row.followUpDueAt, overdue: !!row.followUpDueAt && row.followUpDueAt.getTime() < now }));
  },
  async list(patientId: number) {
    if (!await AppDataSource.getRepository(Patient).exist({ where: { id: patientId, isActive: true } })) throw new NotFoundError('Patient not found');
    return AppDataSource.getRepository(PatientCommunication).find({ where: { patientId }, order: { occurredAt: 'DESC', id: 'DESC' }, take: 100 });
  },
  async create(patientId: number, input: CreateCommunicationInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      if (!await manager.getRepository(Patient).exist({ where: { id: patientId, isActive: true } })) throw new NotFoundError('Patient not found');
      const record = await manager.getRepository(PatientCommunication).save(manager.getRepository(PatientCommunication).create({ patientId, channel: input.channel, direction: input.direction, subject: input.subject, summary: input.summary, occurredAt: new Date(input.occurredAt), followUpDueAt: input.followUpDueAt ? new Date(input.followUpDueAt) : null, followUpCompletedAt: null, followUpCompletedById: null, followUpCompletionNote: null, recordedById: userId }));
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'communication_recorded', changedById: userId, changeSummary: `Communication recorded: ${record.channel} ${record.direction}`, beforeData: null, afterData: JSON.stringify({ id: record.id, channel: record.channel, direction: record.direction, occurredAt: record.occurredAt }) }));
      return record;
    });
  },
  async completeFollowUp(patientId: number, communicationId: number, note: string, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const record = await manager.getRepository(PatientCommunication).createQueryBuilder('communication').setLock('pessimistic_write').where('communication.id = :communicationId AND communication.patient_id = :patientId', { communicationId, patientId }).getOne();
      if (!record) throw new NotFoundError('Patient communication not found');
      if (!record.followUpDueAt) throw new ConflictError('This communication has no follow-up task');
      if (record.followUpCompletedAt) throw new ConflictError('Follow-up is already complete');
      record.followUpCompletedAt = new Date(); record.followUpCompletedById = userId; record.followUpCompletionNote = note;
      await manager.getRepository(PatientCommunication).save(record);
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'follow_up_completed', changedById: userId, changeSummary: `Follow-up completed: ${record.subject}`, beforeData: JSON.stringify({ communicationId, completed: false }), afterData: JSON.stringify({ communicationId, completed: true, note }) }));
      return record;
    });
  },
};
