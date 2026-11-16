import { AppDataSource } from '../../../config/data-source.js';
import { Doctor, OperatingRoom, Patient, SurgeryCase } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { ScheduleSurgeryInput, SurgeryActionInput } from '../validators/surgery.validators.js';

const relations = { patient: true, surgeon: true, room: true, createdBy: true, updatedBy: true } as const;

export const surgeryService = {
  rooms() { return AppDataSource.getRepository(OperatingRoom).find({ where: { isActive: true }, order: { code: 'ASC' } }); },
  cases(filters: { status?: SurgeryCase['status']; patientId?: number }) { return AppDataSource.getRepository(SurgeryCase).find({ where: { ...(filters.status ? { status: filters.status } : {}), ...(filters.patientId ? { patientId: filters.patientId } : {}) }, relations, order: { plannedStart: 'DESC' }, take: 500 }); },
  async schedule(input: ScheduleSurgeryInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :id', { id: input.patientId }).getOne();
      if (!patient || !patient.isActive) throw new NotFoundError('Active patient not found');
      const surgeon = await manager.getRepository(Doctor).createQueryBuilder('doctor').setLock('pessimistic_write').where('doctor.id = :id', { id: input.surgeonId }).getOne();
      if (!surgeon || !surgeon.isActive) throw new NotFoundError('Active surgeon not found');
      const room = await manager.getRepository(OperatingRoom).createQueryBuilder('room').setLock('pessimistic_write').where('room.id = :id', { id: input.roomId }).getOne();
      if (!room || !room.isActive) throw new NotFoundError('Active operating room not found');
      const start = new Date(input.plannedStart); const end = new Date(input.plannedEnd);
      const conflict = await manager.getRepository(SurgeryCase).createQueryBuilder('surgery').where('surgery.status IN (:...statuses)', { statuses: ['scheduled', 'in_progress'] }).andWhere('surgery.planned_start < :end AND surgery.planned_end > :start', { start, end }).andWhere('(surgery.patient_id = :patientId OR surgery.surgeon_id = :surgeonId OR surgery.room_id = :roomId)', { patientId: input.patientId, surgeonId: input.surgeonId, roomId: input.roomId }).getOne();
      if (conflict) throw new ConflictError('Patient, surgeon, or operating room has an overlapping case');
      const record = await manager.getRepository(SurgeryCase).save(manager.getRepository(SurgeryCase).create({ caseNumber: await nextSequenceNumber(manager, 'SURG', 'SURG', 6), patientId: input.patientId, surgeonId: input.surgeonId, roomId: input.roomId, procedure: input.procedure, plannedStart: start, plannedEnd: end, status: 'scheduled', startedAt: null, completedAt: null, outcomeNote: null, cancelReason: null, createdById: userId, updatedById: null }));
      return manager.getRepository(SurgeryCase).findOne({ where: { id: record.id }, relations });
    });
  },
  async action(id: number, input: SurgeryActionInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SurgeryCase);
      const record = await repo.createQueryBuilder('surgery').setLock('pessimistic_write').where('surgery.id = :id', { id }).getOne();
      if (!record) throw new NotFoundError('Surgery case not found');
      if (input.action === 'start') {
        if (record.status !== 'scheduled') throw new ConflictError('Only scheduled cases can be started');
        await manager.getRepository(Doctor).createQueryBuilder('doctor').setLock('pessimistic_write').where('doctor.id = :id', { id: record.surgeonId }).getOne();
        await manager.getRepository(OperatingRoom).createQueryBuilder('room').setLock('pessimistic_write').where('room.id = :id', { id: record.roomId }).getOne();
        const active = await repo.createQueryBuilder('surgery').where('surgery.id <> :id', { id }).andWhere('surgery.status = :status', { status: 'in_progress' }).andWhere('(surgery.room_id = :roomId OR surgery.surgeon_id = :surgeonId)', { roomId: record.roomId, surgeonId: record.surgeonId }).getOne();
        if (active) throw new ConflictError('Surgeon or operating room already has a case in progress');
        record.status = 'in_progress'; record.startedAt = new Date();
      } else if (input.action === 'complete') {
        if (record.status !== 'in_progress') throw new ConflictError('Only cases in progress can be completed');
        record.status = 'completed'; record.completedAt = new Date(); record.outcomeNote = input.outcomeNote;
      } else {
        if (record.status !== 'scheduled') throw new ConflictError('Only scheduled cases can be cancelled');
        record.status = 'cancelled'; record.cancelReason = input.reason;
      }
      record.updatedById = userId;
      await repo.save(record);
      return repo.findOne({ where: { id }, relations });
    });
  },
};
