import { AppDataSource } from '../../../config/data-source.js';
import { Brackets, type EntityManager } from 'typeorm';
import { Doctor, Patient, PatientAuditLog, RadiologyCommunication, RadiologyModality, RadiologyOrder, RadiologyReportAddendum, RadiologyResource, RadiologyScheduleEvent, User, UserNotification } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateRadiologyAddendumInput, CreateRadiologyCommunicationInput, CreateRadiologyOrderInput, CreateRadiologyResourceInput, RadiologyCommunicationQueueInput, RadiologyWorklistInput, ScheduleRadiologyOrderInput, UpdateRadiologyReportInput } from '../validators/radiology.validators.js';

const orderRelations = { patient: true, modality: true, doctor: true, resource: true } as const;
async function auditRadiology(manager: EntityManager, patientId: number, userId: number | null, action: string, changeSummary: string, beforeData: Record<string, unknown> | null, afterData: Record<string, unknown>) {
  await manager.getRepository(PatientAuditLog).save({ patientId, action, changedById: userId, changeSummary, beforeData: beforeData ? JSON.stringify(beforeData) : null, afterData: JSON.stringify(afterData) });
}
function orderResponse(order: RadiologyOrder, canViewDraft: boolean) {
  return !canViewDraft && order.status !== 'reported' ? { ...order, reportText: null, impression: null } : order;
}

export const radiologyService = {
  async cancelOrder(orderId: number, reason: string, userId: number) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RadiologyOrder);
      const order = await repo.createQueryBuilder('study').setLock('pessimistic_write').where('study.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Radiology order not found');
      if (!['ordered', 'scheduled'].includes(order.status)) throw new ConflictError('Only unperformed imaging orders can be cancelled');
      const previousStatus = order.status;
      order.status = 'cancelled';
      order.cancelledAt = new Date();
      order.cancelledById = userId;
      order.cancellationReason = reason;
      await repo.save(order);
      await auditRadiology(manager, order.patientId, userId, 'radiology_order_cancelled', `Radiology order cancelled: ${order.orderNumber}`, { orderId, status: previousStatus, scheduledAt: order.scheduledAt, resourceId: order.resourceId }, { orderId, status: 'cancelled', reason });
      if (order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'radiology_order_cancelled', sourceId: order.id, title: 'Radiology order cancelled', message: `Radiology order ${order.orderNumber} was cancelled. Open the radiology module to review it.`, route: '/radiology' });
        }
      }
      return repo.findOneOrFail({ where: { id: orderId }, relations: orderRelations });
    });
  },
  async communicationQueue({ page, pageSize, search }: RadiologyCommunicationQueueInput) {
    const latestCorrection = '(SELECT MAX(correction.created_at) FROM radiology_report_addenda correction WHERE correction.order_id = study.id)';
    const followUpAt = `COALESCE(${latestCorrection}, CASE WHEN study.status = 'reported' THEN study.reported_at END, study.performed_at, study.ordered_at)`;
    const contactFollowUpAt = followUpAt.replaceAll('study.', 'contactStudy.');
    const pending = AppDataSource.getRepository(RadiologyOrder).createQueryBuilder('study')
      .innerJoin('study.patient', 'patient').innerJoin('study.modality', 'modality')
      .where('study.status IN (:...readyStatuses)', { readyStatuses: ['performed', 'reported'] })
      .andWhere("(study.priority IN (:...priorities) OR (study.status = 'reported' AND EXISTS (SELECT 1 FROM radiology_report_addenda correction WHERE correction.order_id = study.id)))", { priorities: ['urgent', 'stat'] })
      .andWhere(`NOT EXISTS (SELECT 1 FROM radiology_communications delivered WHERE delivered.order_id = study.id AND delivered.outcome = 'delivered' AND delivered.created_at > ${followUpAt} AND delivered.occurred_at >= ${followUpAt})`);
    if (search) {
      const term = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
      pending.andWhere(new Brackets((terms) => {
        terms.where('study.orderNumber LIKE :term', { term })
          .orWhere('patient.mrdNumber LIKE :term', { term })
          .orWhere("CONCAT_WS(' ', patient.firstName, patient.middleName, patient.lastName) LIKE :term", { term })
          .orWhere('study.studyName LIKE :term', { term });
      }));
    }
    const total = await pending.clone().getCount();
    const rows = await pending.clone()
      .select('study.id', 'id').addSelect('study.orderNumber', 'orderNumber').addSelect('study.patientId', 'patientId')
      .addSelect('patient.mrdNumber', 'patientMrdNumber').addSelect('patient.firstName', 'firstName').addSelect('patient.middleName', 'middleName').addSelect('patient.lastName', 'lastName')
      .addSelect('study.studyName', 'studyName').addSelect('modality.modalityName', 'modalityName').addSelect('study.modalityId', 'modalityId')
      .addSelect('study.priority', 'priority').addSelect('study.status', 'status').addSelect('study.performedAt', 'performedAt').addSelect('study.reportedAt', 'reportedAt')
      .addSelect(latestCorrection, 'latestAddendumAt')
      .orderBy(followUpAt, 'ASC').addOrderBy('study.id', 'ASC')
      .limit(pageSize).offset((page - 1) * pageSize).getRawMany<{
        id: number; orderNumber: string; patientId: number; patientMrdNumber: string; firstName: string; middleName: string | null; lastName: string; studyName: string | null; modalityName: string; modalityId: number; priority: 'routine' | 'urgent' | 'stat'; status: 'performed' | 'reported'; performedAt: Date | null; reportedAt: Date | null; latestAddendumAt: Date | null;
      }>();
    const ids = rows.map((row) => Number(row.id));
    const attempts = ids.length ? await AppDataSource.getRepository(RadiologyCommunication).createQueryBuilder('contact')
      .select('contact.orderId', 'orderId').addSelect('COUNT(*)', 'attemptCount').addSelect('MAX(contact.occurredAt)', 'lastAttemptAt')
      .where('contact.orderId IN (:...ids)', { ids }).andWhere('contact.outcome = :attempted', { attempted: 'attempted' })
      .innerJoin('contact.order', 'contactStudy')
      .andWhere(`contact.created_at > ${contactFollowUpAt} AND contact.occurred_at >= ${contactFollowUpAt}`)
      .groupBy('contact.orderId').getRawMany<{ orderId: number; attemptCount: string; lastAttemptAt: Date | null }>() : [];
    const attemptMap = new Map(attempts.map((row) => [Number(row.orderId), row]));
    return { items: rows.map((row) => ({ id: Number(row.id), orderNumber: row.orderNumber, patientId: Number(row.patientId), patientMrdNumber: row.patientMrdNumber, patientName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(' '), studyName: row.studyName || row.modalityName, modalityId: Number(row.modalityId), priority: row.priority, status: row.status, performedAt: row.performedAt, reportedAt: row.reportedAt, latestAddendumAt: row.latestAddendumAt, attemptCount: Number(attemptMap.get(Number(row.id))?.attemptCount ?? 0), lastAttemptAt: attemptMap.get(Number(row.id))?.lastAttemptAt ?? null })), total, page, pageSize };
  },
  listResources() {
    return AppDataSource.getRepository(RadiologyResource).find({ relations: { modality: true }, order: { name: 'ASC' } });
  },
  async createResource(input: CreateRadiologyResourceInput) {
    if (!await AppDataSource.getRepository(RadiologyModality).exist({ where: { id: input.modalityId, isActive: true } })) throw new NotFoundError('Active radiology modality not found');
    const repo = AppDataSource.getRepository(RadiologyResource);
    try {
      return await repo.save(repo.create({ modalityId: input.modalityId, code: input.code, name: input.name, location: input.location ?? null, isActive: true }));
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === 'ER_DUP_ENTRY') throw new ConflictError('Radiology resource code already exists');
      throw error;
    }
  },
  async setResourceActive(resourceId: number, isActive: boolean) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RadiologyResource);
      const resource = await repo.createQueryBuilder('resource').setLock('pessimistic_write').where('resource.id = :id', { id: resourceId }).getOne();
      if (!resource) throw new NotFoundError('Radiology resource not found');
      if (!isActive) {
        const futureBooking = await manager.getRepository(RadiologyOrder).createQueryBuilder('order').where('order.resource_id = :resourceId AND order.status = :status AND order.scheduled_at > :now', { resourceId, status: 'scheduled', now: new Date() }).getExists();
        if (futureBooking) throw new ConflictError('Move upcoming bookings before deactivating this resource');
      }
      resource.isActive = isActive;
      return repo.save(resource);
    });
  },
  async listScheduleEvents(orderId: number) {
    if (!await AppDataSource.getRepository(RadiologyOrder).exist({ where: { id: orderId } })) throw new NotFoundError('Radiology order not found');
    const rows = await AppDataSource.getRepository(RadiologyScheduleEvent).find({ where: { orderId }, relations: { createdBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, previousAt, scheduledAt, previousEndAt, scheduledEndAt, previousResourceId, resourceId, reason, createdById, createdAt, createdBy }) => ({ id, previousAt, scheduledAt, previousEndAt, scheduledEndAt, previousResourceId, resourceId, reason, createdById, createdAt, actorName: createdBy?.fullName ?? null }));
  },
  async scheduleOrder(orderId: number, input: ScheduleRadiologyOrderInput, userId: number | null) {
    const scheduledAt = new Date(input.scheduledAt);
    const scheduledEndAt = new Date(scheduledAt.getTime() + input.durationMinutes * 60_000);
    if (scheduledAt.getTime() <= Date.now()) throw new ValidationError('Study time must be in the future');
    if (scheduledAt.getTime() > Date.now() + 366 * 24 * 60 * 60_000) throw new ValidationError('Study time must be within one year');
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RadiologyOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Radiology order not found');
      if (!['ordered', 'scheduled'].includes(order.status)) throw new ConflictError('Only pending studies can be scheduled');
      if (order.scheduledAt && !input.reason) throw new ValidationError('Rescheduling requires a reason');
      const previousAt = order.scheduledAt;
      const previousEndAt = order.scheduledEndAt;
      const previousResourceId = order.resourceId;
      const resourceId = input.resourceId === undefined ? order.resourceId : input.resourceId;
      if (order.scheduledAt?.getTime() === scheduledAt.getTime() && order.scheduledEndAt?.getTime() === scheduledEndAt.getTime() && resourceId === order.resourceId) throw new ConflictError('Study already has this booking');
      if (resourceId) {
        const resource = await manager.getRepository(RadiologyResource).createQueryBuilder('resource').setLock('pessimistic_write').where('resource.id = :id', { id: resourceId }).getOne();
        if (!resource || !resource.isActive) throw new NotFoundError('Active radiology resource not found');
        if (resource.modalityId !== order.modalityId) throw new ValidationError('Resource does not support this modality');
        const overlaps = await repo.createQueryBuilder('booking')
          .where('booking.resource_id = :resourceId AND booking.status = :status AND booking.id <> :orderId', { resourceId, status: 'scheduled', orderId })
          .andWhere('booking.scheduled_at < :endAt AND booking.scheduled_end_at > :startAt', { startAt: scheduledAt, endAt: scheduledEndAt })
          .getExists();
        if (overlaps) throw new ConflictError('Resource already has a study during this time');
      }
      order.scheduledAt = scheduledAt;
      order.scheduledEndAt = scheduledEndAt;
      order.resourceId = resourceId;
      order.status = 'scheduled';
      await repo.save(order);
      const scheduleEvent = await manager.getRepository(RadiologyScheduleEvent).save({ orderId, previousAt, scheduledAt, previousEndAt, scheduledEndAt, previousResourceId, resourceId, reason: input.reason ?? null, createdById: userId });
      await auditRadiology(manager, order.patientId, userId, previousAt ? 'radiology_order_rescheduled' : 'radiology_order_scheduled', `Radiology order ${previousAt ? 'rescheduled' : 'scheduled'}: ${order.orderNumber}`, { orderId, scheduledAt: previousAt, scheduledEndAt: previousEndAt, resourceId: previousResourceId }, { orderId, scheduleEventId: scheduleEvent.id, scheduledAt, scheduledEndAt, resourceId });
      return repo.findOne({ where: { id: orderId }, relations: orderRelations });
    });
  },
  async listCommunications(orderId: number, canViewDraft: boolean) {
    const order = await AppDataSource.getRepository(RadiologyOrder).findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundError('Radiology order not found');
    const rows = await AppDataSource.getRepository(RadiologyCommunication).find({ where: { orderId }, relations: { recordedBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, outcome, method, recipientName, findingSummary, note, occurredAt, recordedById, createdAt, recordedBy }) => ({ id, outcome, method, recipientName, findingSummary: order.status === 'reported' || canViewDraft ? findingSummary : null, note: order.status === 'reported' || canViewDraft ? note : null, occurredAt, recordedById, createdAt, recorderName: recordedBy?.fullName ?? null }));
  },
  async recordCommunication(orderId: number, input: CreateRadiologyCommunicationInput, userId: number | null) {
    const occurredAt = new Date(input.occurredAt);
    if (occurredAt.getTime() > Date.now() + 5 * 60_000) throw new ValidationError('Communication time cannot be in the future');
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(RadiologyOrder).findOne({ where: { id: orderId } });
      if (!order) throw new NotFoundError('Radiology order not found');
      if (!['performed', 'reported'].includes(order.status)) throw new ConflictError('Communication can only be recorded after a study is performed');
      if (occurredAt < order.orderedAt) throw new ValidationError('Communication time cannot precede the order');
      const repo = manager.getRepository(RadiologyCommunication);
      const row = await repo.save(repo.create({ orderId, outcome: input.outcome, method: input.method, recipientName: input.recipientName, findingSummary: input.findingSummary, note: input.note ?? null, occurredAt, recordedById: userId }));
      await auditRadiology(manager, order.patientId, userId, 'radiology_finding_communication', `Radiology finding communication ${row.outcome}: ${order.orderNumber}`, null, { orderId, communicationId: row.id, outcome: row.outcome, method: row.method });
      const recorder = userId ? await manager.getRepository(User).findOne({ where: { id: userId } }) : null;
      return { id: row.id, outcome: row.outcome, method: row.method, recipientName: row.recipientName, findingSummary: row.findingSummary, note: row.note, occurredAt: row.occurredAt, recordedById: row.recordedById, createdAt: row.createdAt, recorderName: recorder?.fullName ?? null };
    });
  },
  async listAddenda(orderId: number) {
    if (!await AppDataSource.getRepository(RadiologyOrder).exist({ where: { id: orderId } })) throw new NotFoundError('Radiology order not found');
    const rows = await AppDataSource.getRepository(RadiologyReportAddendum).find({ where: { orderId }, relations: { createdBy: true }, order: { id: 'ASC' } });
    return rows.map(({ id, reason, addendum, createdById, createdAt, createdBy }) => ({ id, reason, addendum, createdById, createdAt, authorName: createdBy?.fullName ?? null }));
  },
  async addAddendum(orderId: number, input: CreateRadiologyAddendumInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const order = await manager.getRepository(RadiologyOrder).createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Radiology order not found');
      if (order.status !== 'reported') throw new ConflictError('Only final reports can receive addenda');
      const repo = manager.getRepository(RadiologyReportAddendum);
      const row = await repo.save(repo.create({ orderId, reason: input.reason, addendum: input.addendum, createdById: userId }));
      await auditRadiology(manager, order.patientId, userId, 'radiology_report_amended', `Radiology report amended: ${order.orderNumber}`, { orderId, status: 'reported' }, { orderId, addendumId: row.id });
      if (order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'radiology_report_amended', sourceId: row.id, title: 'Radiology report addendum', message: `Radiology order ${order.orderNumber} has a report addendum. Open the radiology module to review it.`, route: '/radiology' });
        }
      }
      const author = userId ? await manager.getRepository(User).findOne({ where: { id: userId } }) : null;
      return { id: row.id, reason: row.reason, addendum: row.addendum, createdById: row.createdById, createdAt: row.createdAt, authorName: author?.fullName ?? null };
    });
  },
  listModalities() {
    return AppDataSource.getRepository(RadiologyModality).find({ where: { isActive: true }, order: { category: 'ASC', modalityName: 'ASC' } });
  },
  async listOrders(filters: { patientId?: number; status?: RadiologyOrder['status'] }, canViewDraft: boolean) {
    const rows = await AppDataSource.getRepository(RadiologyOrder).find({ where: { ...(filters.patientId ? { patientId: filters.patientId } : {}), ...(filters.status ? { status: filters.status } : {}) }, relations: orderRelations, order: { orderedAt: 'DESC', id: 'DESC' }, take: filters.patientId ? undefined : 100 });
    return rows.map((row) => orderResponse(row, canViewDraft));
  },
  async worklist(input: RadiologyWorklistInput, canViewDraft: boolean) {
    const repo = AppDataSource.getRepository(RadiologyOrder);
    const query = repo.createQueryBuilder('study')
      .leftJoinAndSelect('study.patient', 'patient').leftJoinAndSelect('study.modality', 'modality')
      .leftJoinAndSelect('study.doctor', 'doctor').leftJoinAndSelect('study.resource', 'resource');
    if (input.status) query.andWhere('study.status = :status', { status: input.status });
    if (input.search) {
      const search = `%${input.search.replace(/[%_\\]/g, '\\$&')}%`;
      query.andWhere(new Brackets((terms) => {
        terms.where('study.orderNumber LIKE :search', { search })
          .orWhere('patient.mrdNumber LIKE :search', { search })
          .orWhere("CONCAT_WS(' ', patient.firstName, patient.middleName, patient.lastName) LIKE :search", { search })
          .orWhere('study.studyName LIKE :search', { search })
          .orWhere('modality.modalityName LIKE :search', { search });
      }));
    }
    const [rows, total] = await query.orderBy('study.orderedAt', 'DESC').addOrderBy('study.id', 'DESC')
      .skip((input.page - 1) * input.pageSize).take(input.pageSize).getManyAndCount();
    const counts = await repo.createQueryBuilder('study').select('study.status', 'status').addSelect('COUNT(*)', 'count')
      .groupBy('study.status').getRawMany<{ status: RadiologyOrder['status']; count: string }>();
    const summary = { total: 0, pending: 0, inProgress: 0, reported: 0 };
    for (const { status, count } of counts) {
      const amount = Number(count);
      summary.total += amount;
      if (!['reported', 'cancelled'].includes(status)) summary.pending += amount;
      if (status === 'performed') summary.inProgress += amount;
      if (status === 'reported') summary.reported += amount;
    }
    return { items: rows.map((row) => orderResponse(row, canViewDraft)), total, page: input.page, pageSize: input.pageSize, summary };
  },
  async doctorCandidates(search: string) {
    const escaped = search.replace(/[%_\\]/g, '\\$&');
    const doctors = await AppDataSource.getRepository(Doctor).createQueryBuilder('doctor')
      .select(['doctor.id', 'doctor.name', 'doctor.doctorCode', 'doctor.medicalRegistrationNumber'])
      .where('doctor.is_active = 1')
      .andWhere('(doctor.name LIKE :search OR doctor.doctor_code LIKE :search OR doctor.medical_registration_number LIKE :search)', { search: `%${escaped}%` })
      .orderBy('doctor.name', 'ASC').take(20).getMany();
    return doctors.map((doctor) => ({ id: doctor.id, name: doctor.name, doctorCode: doctor.doctorCode, medicalRegistrationNumber: doctor.medicalRegistrationNumber }));
  },
  async createOrder(input: CreateRadiologyOrderInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const [patient, modality, doctor] = await Promise.all([
        manager.getRepository(Patient).findOne({ where: { id: input.patientId, isActive: true } }),
        manager.getRepository(RadiologyModality).findOne({ where: { id: input.modalityId, isActive: true } }),
        input.doctorId ? manager.getRepository(Doctor).findOne({ where: { id: input.doctorId, isActive: true } }) : Promise.resolve(null),
      ]);
      if (!patient || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      if (!modality) throw new NotFoundError('Radiology modality not found');
      if (input.doctorId && !doctor) throw new NotFoundError('Active doctor not found');
      const repo = manager.getRepository(RadiologyOrder);
      const order = await repo.save(repo.create({ orderNumber: await nextSequenceNumber(manager, 'RAD', 'RAD', 6), patientId: input.patientId, modalityId: input.modalityId, studyName: input.studyName, doctorId: input.doctorId ?? null, status: 'ordered', priority: input.priority, clinicalNotes: input.clinicalNotes ?? null, orderedAt: new Date(), performedAt: null, reportedAt: null, reportText: null, impression: null, createdById: userId, reportedById: null }));
      await auditRadiology(manager, order.patientId, userId, 'radiology_order_created', `Radiology order created: ${order.orderNumber}`, null, { orderId: order.id, modalityId: order.modalityId, priority: order.priority, doctorId: order.doctorId });
      return repo.findOne({ where: { id: order.id }, relations: orderRelations });
    });
  },
  async updateReport(orderId: number, input: UpdateRadiologyReportInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RadiologyOrder);
      const order = await repo.createQueryBuilder('order').setLock('pessimistic_write').where('order.id = :id', { id: orderId }).getOne();
      if (!order) throw new NotFoundError('Radiology order not found');
      if (order.status === 'cancelled') throw new ValidationError('Cancelled radiology order cannot be reported');
      if (order.status === 'reported') throw new ConflictError('Final reports require an amendment workflow');
      if (input.status === 'reported' && order.status !== 'performed') throw new ConflictError('Mark the study performed before final reporting');
      const reportText = input.reportText ?? order.reportText;
      if (input.status === 'reported' && !reportText?.trim()) throw new ValidationError('A final report requires report text');
      const previousStatus = order.status;
      const beforeData = { orderId, status: previousStatus, reportPresent: Boolean(order.reportText?.trim()), impressionPresent: Boolean(order.impression?.trim()) };
      if (input.reportText !== undefined) order.reportText = input.reportText;
      if (input.impression !== undefined) order.impression = input.impression;
      if (input.status === 'performed') {
        order.status = 'performed';
        order.performedAt ??= new Date();
      } else {
        order.status = 'reported';
        order.reportedAt = new Date();
        order.reportedById = userId;
      }
      await repo.save(order);
      if (input.status === 'reported') {
        // Use database precision so a contact immediately before finalization cannot clear the new follow-up period.
        await repo.createQueryBuilder().update().set({ reportedAt: () => 'CURRENT_TIMESTAMP(6)' }).where('id = :id', { id: orderId }).execute();
      }
      const action = input.status === 'reported' ? 'radiology_report_finalized' : previousStatus === 'performed' ? 'radiology_draft_saved' : 'radiology_study_performed';
      const label = input.status === 'reported' ? 'report finalized' : previousStatus === 'performed' ? 'draft saved' : 'study performed';
      await auditRadiology(manager, order.patientId, userId, action, `Radiology ${label}: ${order.orderNumber}`, beforeData, { orderId, status: order.status, reportPresent: Boolean(order.reportText?.trim()), impressionPresent: Boolean(order.impression?.trim()) });
      if (input.status === 'reported' && order.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: order.doctorId, isActive: true } });
        if (doctor?.accountUserId && await manager.getRepository(User).exist({ where: { id: doctor.accountUserId, isActive: true } })) {
          await manager.getRepository(UserNotification).save({ recipientId: doctor.accountUserId, kind: 'radiology_report_final', sourceId: order.id, title: 'Radiology report finalized', message: `Radiology order ${order.orderNumber} has a final report. Open the radiology module to review it.`, route: '/radiology' });
        }
      }
      return repo.findOne({ where: { id: orderId }, relations: orderRelations });
    });
  },
};
