import { AppDataSource } from '../../../config/data-source.js';
import { Doctor, LaboratoryOrder, LaboratoryResultAddendum, LaboratoryTest, Patient, User, UserNotification } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CollectLaboratorySampleInput, CreateLaboratoryAddendumInput, CreateLaboratoryOrderInput, UpdateLaboratoryResultInput } from '../validators/laboratory.validators.js';

export const laboratoryService = {
  async patientCandidates(search: string) {
    const term = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
    const rows = await AppDataSource.getRepository(Patient).createQueryBuilder('patient')
      .select(['patient.id', 'patient.mrdNumber', 'patient.firstName', 'patient.middleName', 'patient.lastName'])
      .where('patient.is_active = 1 AND patient.merged_into_patient_id IS NULL')
      .andWhere('(patient.mrd_number LIKE :term OR patient.first_name LIKE :term OR patient.last_name LIKE :term)', { term })
      .orderBy('patient.id', 'DESC').take(10).getMany();
    return rows.map((patient) => ({ id: patient.id, mrdNumber: patient.mrdNumber, fullName: [patient.firstName, patient.middleName, patient.lastName].filter(Boolean).join(' ') }));
  },
  async doctorCandidates(search: string) {
    const term = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
    const rows = await AppDataSource.getRepository(Doctor).createQueryBuilder('doctor')
      .select(['doctor.id', 'doctor.name', 'doctor.doctorCode', 'doctor.medicalRegistrationNumber'])
      .where('doctor.is_active = 1')
      .andWhere('(doctor.name LIKE :term OR doctor.doctor_code LIKE :term OR doctor.medical_registration_number LIKE :term)', { term })
      .orderBy('doctor.name', 'ASC').take(20).getMany();
    return rows.map(({ id, name, doctorCode, medicalRegistrationNumber }) => ({ id, name, doctorCode, medicalRegistrationNumber }));
  },
  async listAddenda(orderId: number) {
    const order = await AppDataSource.getRepository(LaboratoryOrder).findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Laboratory order not found');
    if (order.status !== 'completed') throw new ConflictError('Addenda are available after result release');
    const rows = await AppDataSource.getRepository(LaboratoryResultAddendum).find({ where: { orderId }, relations: { createdBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, reason, addendum, createdById, createdAt, createdBy }) => ({ id, reason, addendum, createdById, createdAt, authorName: createdBy?.fullName ?? null }));
  },
  async addAddendum(orderId: number, input: CreateLaboratoryAddendumInput, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(LaboratoryOrder).createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'completed') throw new ConflictError('Only released results can receive addenda');
      const repo = manager.getRepository(LaboratoryResultAddendum);
      const row = await repo.save(repo.create({ orderId, reason: input.reason, addendum: input.addendum, createdById: userId }));
      if (order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'lab_result_amended', sourceId: row.id, title: 'Laboratory result addendum', message: `Laboratory order ${order.orderNumber} has a result addendum. Open the laboratory module to review it.`, route: '/laboratory' });
        }
      }
      const author = await manager.getRepository(User).findOne({ where: { id: userId } });
      return { id: row.id, reason: row.reason, addendum: row.addendum, createdById: row.createdById, createdAt: row.createdAt, authorName: author?.fullName ?? null };
    });
  },
  listTests() { return AppDataSource.getRepository(LaboratoryTest).find({ where: { isActive: true }, order: { category: 'ASC', testName: 'ASC' } }); },
  async listOrders(filters: { patientId?: number; status?: LaboratoryOrder['status'] }, canViewDraft: boolean) {
    const rows = await AppDataSource.getRepository(LaboratoryOrder).find({ where: { ...(filters.patientId ? { patientId: filters.patientId } : {}), ...(filters.status ? { status: filters.status } : {}) }, relations: { patient: true, test: true, doctor: true }, order: { orderedAt: 'DESC' } });
    return rows.map((row) => canViewDraft || row.status === 'completed' ? row : { ...row, resultValue: null, resultUnit: null, referenceRange: null, resultNotes: null });
  },
  async createOrder(input: CreateLaboratoryOrderInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const [patient, test, doctor] = await Promise.all([
        manager.getRepository(Patient).findOne({ where: { id: input.patientId, isActive: true } }),
        manager.getRepository(LaboratoryTest).findOne({ where: { id: input.testId, isActive: true } }),
        input.doctorId ? manager.getRepository(Doctor).findOne({ where: { id: input.doctorId, isActive: true } }) : Promise.resolve(null),
      ]);
      if (!patient || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      if (!test) throw new NotFoundError('Active laboratory test not found');
      if (input.doctorId && !doctor) throw new NotFoundError('Active doctor not found');
      const order = await manager.getRepository(LaboratoryOrder).save(manager.getRepository(LaboratoryOrder).create({ orderNumber: await nextSequenceNumber(manager, 'LAB', 'LAB', 6), patientId: input.patientId, testId: input.testId, doctorId: input.doctorId ?? null, priority: input.priority, clinicalNotes: input.clinicalNotes ?? null, status: 'ordered', orderedAt: new Date(), createdById: userId, collectedAt: null, completedAt: null, resultValue: null, resultUnit: null, referenceRange: null, resultNotes: null, resultedById: null }));
      return manager.getRepository(LaboratoryOrder).findOne({ where: { id: order.id }, relations: { patient: true, test: true, doctor: true } });
    });
  },
  async collectSample(orderId: number, input: CollectLaboratorySampleInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'ordered') throw new ConflictError('Only ordered samples can be collected');
      order.status = 'collected'; order.collectedAt = new Date(); order.specimenLabel = input.specimenLabel; order.collectedById = userId;
      await repo.save(order);
      return repo.findOne({ where: { id: orderId }, relations: { patient: true, test: true, doctor: true, collectedBy: true } });
    });
  },
  async updateResult(orderId: number, input: UpdateLaboratoryResultInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status === 'cancelled') throw new ValidationError('Cancelled laboratory order cannot be updated');
      if (order.status === 'ordered') throw new ConflictError('Collect the sample before entering a result');
      if (order.status === 'verified' || order.status === 'completed') throw new ConflictError('Verified and released results cannot be edited');
      order.status = 'processing'; order.resultValue = input.resultValue; order.resultUnit = input.resultUnit ?? null; order.referenceRange = input.referenceRange ?? null; order.resultNotes = input.resultNotes ?? null; order.resultedById = userId;
      await repo.save(order);
      return repo.findOne({ where: { id: orderId }, relations: { patient: true, test: true, doctor: true, collectedBy: true } });
    });
  },
  async verifyResult(orderId: number, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'processing' || !order.resultValue?.trim() || !order.resultedById) throw new ConflictError('Only an attributed draft result can be verified');
      if (order.resultedById === userId) throw new ConflictError('A second staff member must verify this result');
      order.status = 'verified'; order.verifiedAt = new Date(); order.verifiedById = userId;
      await repo.save(order);
      return repo.findOne({ where: { id: orderId }, relations: { patient: true, test: true, doctor: true } });
    });
  },
  async releaseResult(orderId: number, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'verified' || !order.verifiedAt) throw new ConflictError('Verify the result before release');
      order.status = 'completed'; order.completedAt = new Date(); order.releasedById = userId;
      await repo.save(order);
      if (order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'lab_result_completed', sourceId: order.id, title: 'Laboratory result completed', message: `Laboratory order ${order.orderNumber} has a completed result. Open the laboratory module to review it.`, route: '/laboratory' });
        }
      }
      return repo.findOne({ where: { id: orderId }, relations: { patient: true, test: true, doctor: true } });
    });
  },
};
