import { AppDataSource } from '../../../config/data-source.js';
import { Brackets } from 'typeorm';
import { Doctor, LaboratoryCommunication, LaboratoryOrder, LaboratoryResultAddendum, LaboratoryTest, Patient, PatientAuditLog, User, UserNotification } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CollectLaboratorySampleInput, CreateLaboratoryAddendumInput, CreateLaboratoryCommunicationInput, CreateLaboratoryOrderInput, CreateLaboratoryTestInput, LaboratoryWorklistInput, UpdateLaboratoryResultInput } from '../validators/laboratory.validators.js';

const orderRelations = { patient: true, test: true, doctor: true, collectedBy: true } as const;
function orderResponse(order: LaboratoryOrder, canViewDraft = true) {
  const { patient, test, doctor, collectedBy, ...fields } = order;
  return {
    ...fields,
    patient: { id: patient.id, mrdNumber: patient.mrdNumber, firstName: patient.firstName, middleName: patient.middleName, lastName: patient.lastName },
    test: { id: test.id, testCode: test.testCode, testName: test.testName },
    doctor: doctor ? { id: doctor.id, name: doctor.name } : null,
    collectedBy: collectedBy ? { id: collectedBy.id, fullName: collectedBy.fullName } : null,
    ...(!canViewDraft && order.status !== 'completed' ? { resultValue: null, resultUnit: null, referenceRange: null, resultNotes: null } : {}),
  };
}

export const laboratoryService = {
  async listCommunications(orderId: number) {
    if (!await AppDataSource.getRepository(LaboratoryOrder).exist({ where: { id: orderId } })) throw new NotFoundError('Laboratory order not found');
    const rows = await AppDataSource.getRepository(LaboratoryCommunication).find({ where: { orderId }, relations: { recordedBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, outcome, method, recipientName, resultSummary, note, occurredAt, recordedById, createdAt, recordedBy }) => ({ id, outcome, method, recipientName, resultSummary, note, occurredAt, recordedById, createdAt, recorderName: recordedBy?.fullName ?? null }));
  },
  async recordCommunication(orderId: number, input: CreateLaboratoryCommunicationInput, userId: number) {
    const occurredAt = new Date(input.occurredAt);
    if (occurredAt.getTime() > Date.now() + 5 * 60_000) throw new ValidationError('Communication time cannot be in the future');
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(LaboratoryOrder).findOne({ where: { id: orderId } });
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'completed') throw new ConflictError('Only released laboratory results can have a communication record');
      if (occurredAt < order.orderedAt) throw new ValidationError('Communication time cannot precede the order');
      const repo = manager.getRepository(LaboratoryCommunication);
      const row = await repo.save(repo.create({ orderId, outcome: input.outcome, method: input.method, recipientName: input.recipientName, resultSummary: input.resultSummary, note: input.note ?? null, occurredAt, recordedById: userId }));
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_communication', changedById: userId, changeSummary: `Laboratory result communication ${input.outcome}: ${order.orderNumber}`, beforeData: null, afterData: JSON.stringify({ orderId, communicationId: row.id, outcome: row.outcome, method: row.method }) });
      const recorder = await manager.getRepository(User).findOne({ where: { id: userId } });
      return { id: row.id, outcome: row.outcome, method: row.method, recipientName: row.recipientName, resultSummary: row.resultSummary, note: row.note, occurredAt: row.occurredAt, recordedById: row.recordedById, createdAt: row.createdAt, recorderName: recorder?.fullName ?? null };
    });
  },
  async createTest(input: CreateLaboratoryTestInput) {
    const repo = AppDataSource.getRepository(LaboratoryTest);
    if (await repo.exist({ where: { testCode: input.testCode } })) throw new ConflictError('Laboratory test code already exists');
    try { return await repo.save(repo.create({ testCode: input.testCode, testName: input.testName, category: input.category ?? null, priority: input.priority, turnaroundHours: input.turnaroundHours, price: input.price.toFixed(2), isActive: true })); }
    catch (error) { if (error && typeof error === 'object' && 'driverError' in error && (error.driverError as { code?: string })?.code === 'ER_DUP_ENTRY') throw new ConflictError('Laboratory test code already exists'); throw error; }
  },
  async retireTest(id: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryTest);
      const row = await repo.createQueryBuilder('test').setLock('pessimistic_write').where('test.id = :id', { id }).getOne();
      if (!row) throw new NotFoundError('Laboratory test not found');
      if (!row.isActive) throw new ConflictError('Laboratory test is already inactive');
      row.isActive = false;
      return repo.save(row);
    });
  },
  async reactivateTest(id: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryTest);
      const row = await repo.createQueryBuilder('test').setLock('pessimistic_write').where('test.id = :id', { id }).getOne();
      if (!row) throw new NotFoundError('Laboratory test not found');
      if (row.isActive) throw new ConflictError('Laboratory test is already active');
      row.isActive = true;
      return repo.save(row);
    });
  },
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
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_amended', changedById: userId, changeSummary: `Laboratory result amended: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: 'completed' }), afterData: JSON.stringify({ orderId, addendumId: row.id, reason: row.reason }) });
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
  listAllTests() { return AppDataSource.getRepository(LaboratoryTest).find({ order: { category: 'ASC', testName: 'ASC' } }); },
  async cancelOrder(orderId: number, reason: string, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'ordered') throw new ConflictError('Only uncollected laboratory orders can be cancelled');
      order.status = 'cancelled'; order.cancelledAt = new Date(); order.cancelledById = userId; order.cancellationReason = reason;
      await repo.save(order);
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_order_cancelled', changedById: userId, changeSummary: `Laboratory order cancelled: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: 'ordered' }), afterData: JSON.stringify({ orderId, status: 'cancelled', reason }) });
      return orderResponse((await repo.findOneOrFail({ where: { id: orderId }, relations: orderRelations })));
    });
  },
  async listOrders(filters: { patientId?: number; status?: LaboratoryOrder['status'] }, canViewDraft: boolean) {
    const rows = await AppDataSource.getRepository(LaboratoryOrder).find({ where: { ...(filters.patientId ? { patientId: filters.patientId } : {}), ...(filters.status ? { status: filters.status } : {}) }, relations: orderRelations, order: { orderedAt: 'DESC', id: 'DESC' }, take: filters.patientId ? undefined : 100 });
    return rows.map((row) => orderResponse(row, canViewDraft));
  },
  async worklist(input: LaboratoryWorklistInput, canViewDraft: boolean) {
    const repo = AppDataSource.getRepository(LaboratoryOrder);
    const query = repo.createQueryBuilder('lab').leftJoinAndSelect('lab.patient', 'patient').leftJoinAndSelect('lab.test', 'test').leftJoinAndSelect('lab.doctor', 'doctor').leftJoinAndSelect('lab.collectedBy', 'collectedBy');
    if (input.status) query.andWhere('lab.status = :status', { status: input.status });
    if (input.search) {
      const search = `%${input.search.replace(/[%_\\]/g, '\\$&')}%`;
      query.andWhere(new Brackets((terms) => {
        terms.where('lab.orderNumber LIKE :search', { search })
          .orWhere('patient.mrdNumber LIKE :search', { search })
          .orWhere("CONCAT_WS(' ', patient.firstName, patient.middleName, patient.lastName) LIKE :search", { search })
          .orWhere('test.testCode LIKE :search', { search })
          .orWhere('test.testName LIKE :search', { search });
      }));
    }
    const [rows, total] = await query.orderBy('lab.orderedAt', 'DESC').addOrderBy('lab.id', 'DESC').skip((input.page - 1) * input.pageSize).take(input.pageSize).getManyAndCount();
    const counts = await repo.createQueryBuilder('lab').select('lab.status', 'status').addSelect('COUNT(*)', 'count').groupBy('lab.status').getRawMany<{ status: LaboratoryOrder['status']; count: string }>();
    const summary = { total: 0, pending: 0, processing: 0, completed: 0 };
    for (const { status, count } of counts) {
      const amount = Number(count);
      summary.total += amount;
      if (!['completed', 'cancelled'].includes(status)) summary.pending += amount;
      if (['collected', 'processing', 'verified'].includes(status)) summary.processing += amount;
      if (status === 'completed') summary.completed += amount;
    }
    return { items: rows.map((row) => orderResponse(row, canViewDraft)), total, page: input.page, pageSize: input.pageSize, summary };
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
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_order_created', changedById: userId, changeSummary: `Laboratory order created: ${order.orderNumber}`, beforeData: null, afterData: JSON.stringify({ orderId: order.id, testId: order.testId, priority: order.priority, doctorId: order.doctorId }) });
      return orderResponse((await manager.getRepository(LaboratoryOrder).findOneOrFail({ where: { id: order.id }, relations: orderRelations })));
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
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_sample_collected', changedById: userId, changeSummary: `Laboratory sample collected: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: 'ordered' }), afterData: JSON.stringify({ orderId, status: 'collected', specimenLabel: order.specimenLabel }) });
      return orderResponse((await repo.findOneOrFail({ where: { id: orderId }, relations: orderRelations })));
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
      const previousStatus = order.status;
      order.status = 'processing'; order.resultValue = input.resultValue; order.resultUnit = input.resultUnit ?? null; order.referenceRange = input.referenceRange ?? null; order.resultNotes = input.resultNotes ?? null; order.resultedById = userId;
      await repo.save(order);
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_draft_saved', changedById: userId, changeSummary: `Laboratory draft saved: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: previousStatus }), afterData: JSON.stringify({ orderId, status: 'processing' }) });
      return orderResponse((await repo.findOneOrFail({ where: { id: orderId }, relations: orderRelations })));
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
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_verified', changedById: userId, changeSummary: `Laboratory result verified: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: 'processing' }), afterData: JSON.stringify({ orderId, status: 'verified' }) });
      return orderResponse((await repo.findOneOrFail({ where: { id: orderId }, relations: orderRelations })));
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
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_released', changedById: userId, changeSummary: `Laboratory result released: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: 'verified' }), afterData: JSON.stringify({ orderId, status: 'completed' }) });
      if (order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'lab_result_completed', sourceId: order.id, title: 'Laboratory result completed', message: `Laboratory order ${order.orderNumber} has a completed result. Open the laboratory module to review it.`, route: '/laboratory' });
        }
      }
      return orderResponse((await repo.findOneOrFail({ where: { id: orderId }, relations: orderRelations })));
    });
  },
};
