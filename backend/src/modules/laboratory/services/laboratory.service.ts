import { createHash } from 'node:crypto';
import { AppDataSource } from '../../../config/data-source.js';
import { Brackets } from 'typeorm';
import { Doctor, LaboratoryCommunication, LaboratoryOrder, LaboratoryReportArchive, LaboratoryResultAddendum, LaboratoryTest, LaboratoryTestRevision, Patient, PatientAuditLog, User, UserNotification } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CollectLaboratorySampleInput, CreateLaboratoryAddendumInput, CreateLaboratoryCommunicationInput, CreateLaboratoryOrderInput, CreateLaboratoryTestInput, LaboratoryCommunicationQueueInput, LaboratoryWorklistInput, UpdateLaboratoryResultInput, UpdateLaboratoryTestInput, VerifyLaboratoryResultInput } from '../validators/laboratory.validators.js';

const orderRelations = { patient: true, test: true, doctor: true, collectedBy: true } as const;
function orderResponse(order: LaboratoryOrder, canViewDraft = true) {
  const { patient, test, doctor, collectedBy, ...fields } = order;
  return {
    ...fields,
    patient: { id: patient.id, mrdNumber: patient.mrdNumber, firstName: patient.firstName, middleName: patient.middleName, lastName: patient.lastName },
    test: { id: test.id, testCode: test.testCode, testName: test.testName },
    doctor: doctor ? { id: doctor.id, name: doctor.name } : null,
    collectedBy: collectedBy ? { id: collectedBy.id, fullName: collectedBy.fullName } : null,
    ...(!canViewDraft && order.status !== 'completed' ? { resultValue: null, resultUnit: null, referenceRange: null, resultNotes: null, criticalReason: null } : {}),
  };
}

export const laboratoryService = {
  async communicationQueue({ page, pageSize, search }: LaboratoryCommunicationQueueInput) {
    const pending = AppDataSource.getRepository(LaboratoryOrder).createQueryBuilder('lab')
      .innerJoin('lab.patient', 'patient').innerJoin('lab.test', 'test')
      .where('lab.status IN (:...readyStatuses)', { readyStatuses: ['verified', 'completed'] })
      .andWhere("(lab.priority IN (:...priorities) OR lab.critical_result = 1 OR (lab.status = 'completed' AND EXISTS (SELECT 1 FROM laboratory_result_addenda correction WHERE correction.order_id = lab.id AND correction.approved_at IS NOT NULL)))", { priorities: ['urgent', 'stat'] })
      .andWhere("NOT EXISTS (SELECT 1 FROM laboratory_communications delivered WHERE delivered.order_id = lab.id AND delivered.outcome = 'delivered' AND (NOT EXISTS (SELECT 1 FROM laboratory_result_addenda correction WHERE correction.order_id = lab.id AND correction.approved_at IS NOT NULL) OR (delivered.created_at > (SELECT MAX(correction.created_at) FROM laboratory_result_addenda correction WHERE correction.order_id = lab.id AND correction.approved_at IS NOT NULL) AND delivered.occurred_at >= (SELECT MAX(correction.created_at) FROM laboratory_result_addenda correction WHERE correction.order_id = lab.id AND correction.approved_at IS NOT NULL))))");
    if (search) {
      const term = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
      pending.andWhere(new Brackets((terms) => {
        terms.where('lab.orderNumber LIKE :term', { term })
          .orWhere('patient.mrdNumber LIKE :term', { term })
          .orWhere("CONCAT_WS(' ', patient.firstName, patient.middleName, patient.lastName) LIKE :term", { term })
          .orWhere('test.testName LIKE :term', { term });
      }));
    }
    const total = await pending.clone().getCount();
    const rows = await pending.clone()
      .select('lab.id', 'id').addSelect('lab.orderNumber', 'orderNumber')
      .addSelect('lab.patientId', 'patientId').addSelect('patient.mrdNumber', 'patientMrdNumber')
      .addSelect('patient.firstName', 'firstName').addSelect('patient.middleName', 'middleName').addSelect('patient.lastName', 'lastName')
      .addSelect('test.testName', 'testName').addSelect('lab.priority', 'priority').addSelect('lab.criticalResult', 'criticalResult').addSelect('lab.status', 'status').addSelect('lab.verifiedAt', 'verifiedAt').addSelect('lab.completedAt', 'completedAt')
      .addSelect('(SELECT MAX(correction.created_at) FROM laboratory_result_addenda correction WHERE correction.order_id = lab.id AND correction.approved_at IS NOT NULL)', 'latestAddendumAt')
      .orderBy('COALESCE((SELECT MAX(correction.created_at) FROM laboratory_result_addenda correction WHERE correction.order_id = lab.id AND correction.approved_at IS NOT NULL), lab.verifiedAt, lab.completedAt, lab.orderedAt)', 'ASC').addOrderBy('lab.id', 'ASC')
      .limit(pageSize).offset((page - 1) * pageSize).getRawMany<{
        id: number; orderNumber: string; patientId: number; patientMrdNumber: string; firstName: string; middleName: string | null; lastName: string; testName: string; priority: 'routine' | 'urgent' | 'stat'; criticalResult: boolean; status: 'verified' | 'completed'; verifiedAt: Date | null; completedAt: Date | null; latestAddendumAt: Date | null;
      }>();
    const ids = rows.map((row) => row.id);
    const attempts = ids.length ? await AppDataSource.getRepository(LaboratoryCommunication).createQueryBuilder('contact')
      .select('contact.orderId', 'orderId').addSelect('COUNT(*)', 'attemptCount').addSelect('MAX(contact.occurredAt)', 'lastAttemptAt')
      .where('contact.orderId IN (:...ids)', { ids }).andWhere('contact.outcome = :attempted', { attempted: 'attempted' })
      .andWhere("(NOT EXISTS (SELECT 1 FROM laboratory_result_addenda correction WHERE correction.order_id = contact.order_id AND correction.approved_at IS NOT NULL) OR (contact.created_at > (SELECT MAX(correction.created_at) FROM laboratory_result_addenda correction WHERE correction.order_id = contact.order_id AND correction.approved_at IS NOT NULL) AND contact.occurred_at >= (SELECT MAX(correction.created_at) FROM laboratory_result_addenda correction WHERE correction.order_id = contact.order_id AND correction.approved_at IS NOT NULL)))")
      .groupBy('contact.orderId').getRawMany<{ orderId: number; attemptCount: string; lastAttemptAt: Date | null }>() : [];
    const attemptMap = new Map(attempts.map((row) => [Number(row.orderId), row]));
    return { items: rows.map((row) => ({ id: Number(row.id), orderNumber: row.orderNumber, patientId: Number(row.patientId), patientMrdNumber: row.patientMrdNumber, patientName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '), testName: row.testName, priority: row.priority, criticalResult: Boolean(row.criticalResult), status: row.status, verifiedAt: row.verifiedAt, completedAt: row.completedAt, latestAddendumAt: row.latestAddendumAt, attemptCount: Number(attemptMap.get(Number(row.id))?.attemptCount ?? 0), lastAttemptAt: attemptMap.get(Number(row.id))?.lastAttemptAt ?? null })), total, page, pageSize };
  },
  async listCommunications(orderId: number, canViewUnreleasedResult: boolean) {
    const order = await AppDataSource.getRepository(LaboratoryOrder).findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Laboratory order not found');
    const rows = await AppDataSource.getRepository(LaboratoryCommunication).find({ where: { orderId }, relations: { recordedBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, outcome, method, recipientName, resultSummary, note, occurredAt, recordedById, createdAt, recordedBy }) => ({ id, outcome, method, recipientName, resultSummary: order.status === 'completed' || canViewUnreleasedResult ? resultSummary : null, note: order.status === 'completed' || canViewUnreleasedResult ? note : null, occurredAt, recordedById, createdAt, recorderName: recordedBy?.fullName ?? null }));
  },
  async recordCommunication(orderId: number, input: CreateLaboratoryCommunicationInput, userId: number) {
    const occurredAt = new Date(input.occurredAt);
    if (occurredAt.getTime() > Date.now() + 5 * 60_000) throw new ValidationError('Communication time cannot be in the future');
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(LaboratoryOrder).findOne({ where: { id: orderId } });
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'completed' && !(order.status === 'verified' && (order.criticalResult || ['urgent', 'stat'].includes(order.priority)))) throw new ConflictError('Communication requires a released result or a verified urgent, STAT, or critical result');
      if (occurredAt < order.orderedAt) throw new ValidationError('Communication time cannot precede the order');
      if (order.verifiedAt && occurredAt < order.verifiedAt) throw new ValidationError('Communication time cannot precede result verification');
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
  async updateTest(id: number, input: UpdateLaboratoryTestInput, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const tests = manager.getRepository(LaboratoryTest);
      const test = await tests.createQueryBuilder('test').setLock('pessimistic_write').where('test.id = :id', { id }).getOne();
      if (!test) throw new NotFoundError('Laboratory test not found');
      const beforeData: Record<string, unknown> = {};
      const afterData: Record<string, unknown> = {};
      const revise = <K extends keyof UpdateLaboratoryTestInput>(field: K, current: unknown, next: UpdateLaboratoryTestInput[K]) => {
        if (next === undefined || String(current) === String(next)) return;
        beforeData[field] = field === 'price' ? Number(current) : current;
        afterData[field] = next;
      };
      revise('testName', test.testName, input.testName);
      revise('category', test.category, input.category);
      revise('priority', test.priority, input.priority);
      revise('turnaroundHours', test.turnaroundHours, input.turnaroundHours);
      revise('price', test.price, input.price);
      if (Object.keys(afterData).length === 0) throw new ConflictError('The submitted catalog values do not change this test');
      if (input.testName !== undefined) test.testName = input.testName;
      if (input.category !== undefined) test.category = input.category;
      if (input.priority !== undefined) test.priority = input.priority;
      if (input.turnaroundHours !== undefined) test.turnaroundHours = input.turnaroundHours;
      if (input.price !== undefined) test.price = input.price.toFixed(2);
      const saved = await tests.save(test);
      await manager.getRepository(LaboratoryTestRevision).save({ testId: id, beforeData, afterData, changedById: userId });
      return saved;
    });
  },
  async listTestRevisions(id: number) {
    if (!await AppDataSource.getRepository(LaboratoryTest).exist({ where: { id } })) throw new NotFoundError('Laboratory test not found');
    const revisions = await AppDataSource.getRepository(LaboratoryTestRevision).find({ where: { testId: id }, relations: { changedBy: true }, order: { createdAt: 'DESC', id: 'DESC' } });
    return revisions.map(({ id: revisionId, testId, beforeData, afterData, changedById, changedBy, createdAt }) => ({ id: revisionId, testId, beforeData, afterData, changedById, changedByName: changedBy.fullName, createdAt }));
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
    const rows = await AppDataSource.getRepository(LaboratoryResultAddendum).find({ where: { orderId }, relations: { createdBy: true, approvedBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, reason, addendum, createdById, createdAt, createdBy, approvedById, approvedAt, approvedBy }) => ({ id, reason, addendum, createdById, createdAt, authorName: createdBy?.fullName ?? null, approvedById, approvedAt, approverName: approvedBy?.fullName ?? null }));
  },
  async reportArchive(orderId: number) {
    const order = await AppDataSource.getRepository(LaboratoryOrder).findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Laboratory order not found');
    if (order.status !== 'completed') throw new ConflictError('A released result is required before its archive can be viewed');
    const archive = await AppDataSource.getRepository(LaboratoryReportArchive).findOne({ where: { orderId } });
    if (!archive) throw new NotFoundError('Laboratory report archive not found');
    return { id: archive.id, orderId: archive.orderId, snapshot: archive.snapshot, checksum: archive.checksum, releasedAt: archive.releasedAt, archivedAt: archive.createdAt, archivedById: archive.archivedById };
  },
  async addAddendum(orderId: number, input: CreateLaboratoryAddendumInput, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(LaboratoryOrder).createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'completed') throw new ConflictError('Only released results can receive addenda');
      const repo = manager.getRepository(LaboratoryResultAddendum);
      const row = await repo.save(repo.create({ orderId, reason: input.reason, addendum: input.addendum, createdById: userId, approvedById: null, approvedAt: null }));
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_amended', changedById: userId, changeSummary: `Laboratory result amended: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: 'completed' }), afterData: JSON.stringify({ orderId, addendumId: row.id, reason: row.reason }) });
      const author = await manager.getRepository(User).findOne({ where: { id: userId } });
      return { id: row.id, reason: row.reason, addendum: row.addendum, createdById: row.createdById, createdAt: row.createdAt, authorName: author?.fullName ?? null, approvedById: null, approvedAt: null, approverName: null };
    });
  },
  async approveAddendum(addendumId: number, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryResultAddendum);
      const row = await repo.createQueryBuilder('addendum').setLock('pessimistic_write').where('addendum.id = :id', { id: addendumId }).getOne();
      if (!row) throw new NotFoundError('Laboratory result addendum not found');
      if (row.approvedAt) throw new ConflictError('Laboratory result addendum is already approved');
      if (row.createdById === userId) throw new ValidationError('A correction author cannot approve their own correction');
      const order = await manager.getRepository(LaboratoryOrder).findOne({ where: { id: row.orderId } });
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'completed') throw new ConflictError('Only released result corrections can be approved');
      row.approvedById = userId; row.approvedAt = new Date();
      await repo.save(row);
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_amendment_approved', changedById: userId, changeSummary: `Laboratory result correction approved: ${order.orderNumber}`, beforeData: JSON.stringify({ addendumId: row.id, approved: false }), afterData: JSON.stringify({ addendumId: row.id, approved: true }) });
      if (order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'lab_result_amended', sourceId: row.id, title: 'Laboratory result addendum', message: `Laboratory order ${order.orderNumber} has an approved result addendum. Open the laboratory module to review it.`, route: '/laboratory' });
      }
      const [author, approver] = await Promise.all([manager.getRepository(User).findOne({ where: { id: row.createdById ?? 0 } }), manager.getRepository(User).findOne({ where: { id: userId } })]);
      return { id: row.id, reason: row.reason, addendum: row.addendum, createdById: row.createdById, createdAt: row.createdAt, authorName: author?.fullName ?? null, approvedById: row.approvedById, approvedAt: row.approvedAt, approverName: approver?.fullName ?? null };
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
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :id', { id: input.patientId }).getOne();
      if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      const [test, doctor] = await Promise.all([
        manager.getRepository(LaboratoryTest).findOne({ where: { id: input.testId, isActive: true } }),
        input.doctorId ? manager.getRepository(Doctor).findOne({ where: { id: input.doctorId, isActive: true } }) : Promise.resolve(null),
      ]);
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
  async verifyResult(orderId: number, input: VerifyLaboratoryResultInput, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'processing' || !order.resultValue?.trim() || !order.resultedById) throw new ConflictError('Only an attributed draft result can be verified');
      if (order.resultedById === userId) throw new ConflictError('A second staff member must verify this result');
      order.status = 'verified'; order.verifiedAt = new Date(); order.verifiedById = userId; order.criticalResult = input.criticalResult; order.criticalReason = input.criticalReason;
      await repo.save(order);
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_verified', changedById: userId, changeSummary: `Laboratory result verified: ${order.orderNumber}${order.criticalResult ? ' (critical)' : ''}`, beforeData: JSON.stringify({ orderId, status: 'processing' }), afterData: JSON.stringify({ orderId, status: 'verified', criticalResult: order.criticalResult }) });
      if (order.criticalResult && order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'lab_result_critical', sourceId: order.id, title: 'Critical laboratory result verified', message: `Laboratory order ${order.orderNumber} has a verified critical result awaiting direct communication. Contact the laboratory for details.`, route: '/laboratory' });
        }
      }
      return orderResponse((await repo.findOneOrFail({ where: { id: orderId }, relations: orderRelations })));
    });
  },
  async releaseResult(orderId: number, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(LaboratoryOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Laboratory order not found');
      if (order.status !== 'verified' || !order.verifiedAt) throw new ConflictError('Verify the result before release');
      const releasedAt = new Date();
      const [patient, test, verifiedBy, releasedBy, addenda] = await Promise.all([
        manager.getRepository(Patient).findOneByOrFail({ id: order.patientId }),
        manager.getRepository(LaboratoryTest).findOneByOrFail({ id: order.testId }),
        order.verifiedById ? manager.getRepository(User).findOneBy({ id: order.verifiedById }) : Promise.resolve(null),
        manager.getRepository(User).findOneBy({ id: userId }),
        manager.getRepository(LaboratoryResultAddendum).find({ where: { orderId }, relations: { createdBy: true, approvedBy: true }, order: { id: 'ASC' } }),
      ]);
      const snapshot = {
        version: 1,
        archivedAt: releasedAt.toISOString(),
        patient: { id: patient.id, mrdNumber: patient.mrdNumber, firstName: patient.firstName, middleName: patient.middleName, lastName: patient.lastName, dateOfBirth: patient.dateOfBirth, gender: patient.gender },
        order: { id: order.id, orderNumber: order.orderNumber, priority: order.priority, orderedAt: order.orderedAt.toISOString(), collectedAt: order.collectedAt?.toISOString() ?? null, specimenLabel: order.specimenLabel },
        test: { id: test.id, testCode: test.testCode, testName: test.testName, category: test.category },
        result: { value: order.resultValue, unit: order.resultUnit, referenceRange: order.referenceRange, notes: order.resultNotes, critical: order.criticalResult, criticalReason: order.criticalReason },
        verification: { verifiedAt: order.verifiedAt.toISOString(), verifiedById: order.verifiedById, verifiedByName: verifiedBy?.fullName ?? null },
        release: { releasedAt: releasedAt.toISOString(), releasedById: userId, releasedByName: releasedBy?.fullName ?? null },
        addenda: addenda.map((addendum) => ({ id: addendum.id, reason: addendum.reason, addendum: addendum.addendum, createdAt: addendum.createdAt.toISOString(), createdById: addendum.createdById, authorName: addendum.createdBy?.fullName ?? null, approvedAt: addendum.approvedAt?.toISOString() ?? null, approvedById: addendum.approvedById, approverName: addendum.approvedBy?.fullName ?? null })),
      };
      const checksum = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
      await manager.getRepository(LaboratoryReportArchive).save(manager.getRepository(LaboratoryReportArchive).create({ orderId, snapshot, checksum, releasedAt, archivedById: userId }));
      order.status = 'completed'; order.completedAt = releasedAt; order.releasedById = userId;
      await repo.save(order);
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_result_released', changedById: userId, changeSummary: `Laboratory result released: ${order.orderNumber}`, beforeData: JSON.stringify({ orderId, status: 'verified' }), afterData: JSON.stringify({ orderId, status: 'completed' }) });
      await manager.getRepository(PatientAuditLog).save({ patientId: order.patientId, action: 'laboratory_report_archived', changedById: userId, changeSummary: `Laboratory report archived: ${order.orderNumber}`, beforeData: null, afterData: JSON.stringify({ orderId, checksum }) });
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
