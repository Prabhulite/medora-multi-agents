import { AppDataSource } from '../../../config/data-source.js';
import { IsNull } from 'typeorm';
import { Admission, AdmissionHomeMedicationReview, Bed, BedTransfer, Department, DischargeHomeMedicationReview, DischargeMedicationReview, Doctor, HomeMedication, MedicationAdministration, NursingCarePlan, NursingCarePlanReview, NursingHandoff, NursingHandoffAssignment, NursingObservation, Patient, PatientAuditLog, Prescription, Ward, Medication, User } from '../../../database/entities/index.js';
import { assertNoRecordedAllergy } from '../../clinical/services/allergy-check.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateAdmissionInput } from '../validators/inpatient.validators.js';
import type { z } from 'zod';
import { admissionMedicationReviewSchema, closeCarePlanSchema, continueCarePlanSchema, createCarePlanSchema, createNursingHandoffSchema, dischargeSummarySchema, medicationAdministrationSchema, nursingObservationSchema, reassignNursingHandoffSchema, transferBedSchema } from '../validators/inpatient.validators.js';

function carePlanResponse(plan: NursingCarePlan | null) {
  if (!plan) throw new NotFoundError('Care plan not found');
  const { createdBy, closedBy, ...fields } = plan;
  return { ...fields, createdBy: createdBy ? { fullName: createdBy.fullName } : null, closedBy: closedBy ? { fullName: closedBy.fullName } : null };
}

const staffReference = (user: User | null | undefined) => user ? { id: user.id, fullName: user.fullName } : null;
const medicationAdministrationResponse = (row: MedicationAdministration | null) => row ? { ...row, administeredBy: staffReference(row.administeredBy) } : null;
const transferResponse = (row: BedTransfer | null) => row ? { ...row, transferredBy: staffReference(row.transferredBy) } : null;
const observationResponse = (row: NursingObservation) => ({ ...row, recordedBy: staffReference(row.recordedBy) });
const handoffResponse = (row: NursingHandoff) => { const { outgoingBy, recipient, acknowledgedBy, closedOnDischargeBy, ...fields } = row; return { ...fields, outgoingBy: staffReference(outgoingBy), recipient: staffReference(recipient), acknowledgedBy: staffReference(acknowledgedBy), closedOnDischargeBy: staffReference(closedOnDischargeBy) }; };

export const inpatientService = {
  async nursingHandoffAssignments(admissionId: number, handoffId: number) {
    if (!(await AppDataSource.getRepository(NursingHandoff).exist({ where: { id: handoffId, admissionId } }))) throw new NotFoundError('Handoff not found');
    const rows = await AppDataSource.getRepository(NursingHandoffAssignment).find({ where: { handoffId }, relations: { fromRecipient: true, toRecipient: true, changedBy: true }, order: { id: 'ASC' } });
    return rows.map(({ fromRecipient, toRecipient, changedBy, ...fields }) => ({ ...fields, fromRecipient: staffReference(fromRecipient), toRecipient: staffReference(toRecipient), changedBy: staffReference(changedBy) }));
  },
  async reassignNursingHandoff(admissionId: number, handoffId: number, input: z.infer<typeof reassignNursingHandoffSchema>, userId: number | null) {
    if (!userId) throw new ValidationError('Staff identity is required');
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot reassign a handoff after discharge');
      const handoff = await manager.getRepository(NursingHandoff).createQueryBuilder('handoff').setLock('pessimistic_write').where('handoff.id = :handoffId AND handoff.admission_id = :admissionId', { handoffId, admissionId }).getOne();
      if (!handoff) throw new NotFoundError('Handoff not found');
      if (handoff.acknowledgedAt) throw new ConflictError('Handoff is already acknowledged');
      if (handoff.closedOnDischargeAt) throw new ConflictError('Handoff was closed on discharge');
      if (input.recipientId === handoff.recipientId) throw new ConflictError('Handoff is already assigned to this staff member');
      if (input.recipientId === handoff.outgoingById) throw new ValidationError('Outgoing staff cannot receive their own handoff');
      const recipient = await manager.getRepository(User).createQueryBuilder('staff')
        .leftJoin('staff.roles', 'role', 'role.is_active = 1').leftJoin('role.permissions', 'permission')
        .leftJoin('staff.roles', 'viewRole', 'viewRole.is_active = 1')
        .leftJoin('viewRole.permissions', 'viewPermission', 'viewPermission.code = :viewCode', { viewCode: 'inpatient.view' })
        .where('staff.id = :recipientId AND staff.is_active = 1', { recipientId: input.recipientId })
        .andWhere('(staff.is_super_admin = 1 OR (permission.code = :code AND viewPermission.code = :viewCode))', { code: 'inpatient.update', viewCode: 'inpatient.view' }).getOne();
      if (!recipient) throw new ValidationError('Receiving staff must have active inpatient view and update permissions');
      const fromRecipientId = handoff.recipientId;
      handoff.recipientId = recipient.id;
      await manager.getRepository(NursingHandoff).save(handoff);
      const assignment = await manager.getRepository(NursingHandoffAssignment).save({ handoffId, fromRecipientId, toRecipientId: recipient.id, reason: input.reason, changedById: userId });
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'nursing_handoff_reassigned', changedById: userId, changeSummary: `Nursing handoff reassigned for admission ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId, handoffId, recipientId: fromRecipientId }), afterData: JSON.stringify({ admissionId, handoffId, assignmentId: assignment.id, recipientId: recipient.id }) });
      return handoffResponse((await manager.getRepository(NursingHandoff).findOne({ where: { id: handoffId }, relations: { outgoingBy: true, recipient: true, acknowledgedBy: true } }))!);
    });
  },
  async handoffReceivers(search: string, currentUserId: number) {
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const users = await AppDataSource.getRepository(User).createQueryBuilder('staff')
      .leftJoin('staff.roles', 'role', 'role.is_active = 1')
      .leftJoin('role.permissions', 'permission')
      .leftJoin('staff.roles', 'viewRole', 'viewRole.is_active = 1')
      .leftJoin('viewRole.permissions', 'viewPermission', 'viewPermission.code = :viewCode', { viewCode: 'inpatient.view' })
      .where('staff.is_active = 1 AND staff.id <> :currentUserId', { currentUserId })
      .andWhere('(staff.is_super_admin = 1 OR (permission.code = :code AND viewPermission.code = :viewCode))', { code: 'inpatient.update', viewCode: 'inpatient.view' })
      .andWhere('(staff.full_name LIKE :pattern OR staff.employee_id LIKE :pattern OR staff.username LIKE :pattern)', { pattern })
      .select(['staff.id', 'staff.fullName', 'staff.employeeId', 'staff.designation'])
      .distinct(true).orderBy('staff.fullName', 'ASC').take(20).getMany();
    return users.map(({ id, fullName, employeeId, designation }) => ({ id, fullName, employeeId, designation }));
  },
  async pendingNursingHandoffs(page: number, pageSize: number) {
    const query = AppDataSource.getRepository(NursingHandoff).createQueryBuilder('handoff')
      .innerJoin('handoff.admission', 'admission')
      .innerJoin('admission.patient', 'patient')
      .innerJoin('admission.bed', 'bed')
      .innerJoin('bed.ward', 'ward')
      .innerJoin('handoff.outgoingBy', 'outgoing')
      .leftJoin('handoff.recipient', 'recipient')
      .where('handoff.acknowledged_at IS NULL AND handoff.closed_on_discharge_at IS NULL')
      .andWhere('admission.status IN (:...statuses)', { statuses: ['admitted', 'transferred'] });
    const total = await query.clone().getCount();
    const items = await query.select('handoff.id', 'id').addSelect('handoff.admissionId', 'admissionId')
      .addSelect('handoff.createdAt', 'createdAt').addSelect('outgoing.id', 'outgoingById')
      .addSelect('handoff.acknowledgementDueAt', 'acknowledgementDueAt')
      .addSelect('outgoing.fullName', 'outgoingByName')
      .addSelect('handoff.recipientId', 'recipientId')
      .addSelect('recipient.fullName', 'recipientName')
      .addSelect('admission.admissionNumber', 'admissionNumber')
      .addSelect('patient.mrdNumber', 'patientMrdNumber')
      .addSelect("CONCAT_WS(' ', patient.firstName, patient.middleName, patient.lastName)", 'patientName')
      .addSelect('ward.name', 'wardName').addSelect('bed.number', 'bedNumber')
      .orderBy('CASE WHEN handoff.acknowledgement_due_at IS NULL THEN 1 ELSE 0 END', 'ASC')
      .addOrderBy('handoff.acknowledgementDueAt', 'ASC').addOrderBy('handoff.id', 'ASC')
      .limit(pageSize).offset((page - 1) * pageSize).getRawMany();
    return { items, total, page, pageSize };
  },
  async nursingHandoffs(admissionId: number) {
    if (!(await AppDataSource.getRepository(Admission).exist({ where: { id: admissionId } }))) throw new NotFoundError('Admission not found');
    const rows = await AppDataSource.getRepository(NursingHandoff).find({ where: { admissionId }, relations: { outgoingBy: true, recipient: true, acknowledgedBy: true, closedOnDischargeBy: true }, order: { id: 'DESC' }, take: 100 });
    return rows.map(handoffResponse);
  },
  async createNursingHandoff(admissionId: number, input: z.infer<typeof createNursingHandoffSchema>, userId: number | null) {
    if (!userId) throw new ValidationError('Staff identity is required');
    const acknowledgementDueAt = new Date(input.acknowledgementDueAt);
    if (acknowledgementDueAt.getTime() <= Date.now()) throw new ValidationError('Acknowledgement due time must be in the future');
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot hand off a discharged admission');
      if (input.recipientId === userId) throw new ValidationError('Receiving staff must be different from outgoing staff');
      const recipient = await manager.getRepository(User).createQueryBuilder('staff')
        .leftJoin('staff.roles', 'role', 'role.is_active = 1')
        .leftJoin('role.permissions', 'permission')
        .leftJoin('staff.roles', 'viewRole', 'viewRole.is_active = 1')
        .leftJoin('viewRole.permissions', 'viewPermission', 'viewPermission.code = :viewCode', { viewCode: 'inpatient.view' })
        .where('staff.id = :recipientId AND staff.is_active = 1', { recipientId: input.recipientId })
        .andWhere('(staff.is_super_admin = 1 OR (permission.code = :code AND viewPermission.code = :viewCode))', { code: 'inpatient.update', viewCode: 'inpatient.view' }).getOne();
      if (!recipient) throw new ValidationError('Receiving staff must have active inpatient view and update permissions');
      const pending = await manager.getRepository(NursingHandoff).exist({ where: { admissionId, acknowledgedAt: IsNull(), closedOnDischargeAt: IsNull() } });
      if (pending) throw new ConflictError('A handoff is still awaiting acknowledgement');
      if (acknowledgementDueAt.getTime() <= Date.now()) throw new ValidationError('Acknowledgement due time must be in the future');
      const record = await manager.getRepository(NursingHandoff).save({ admissionId, conditionSummary: input.conditionSummary, pendingTasks: input.pendingTasks, safetyConcerns: input.safetyConcerns ?? null, outgoingById: userId, recipientId: recipient.id, acknowledgementDueAt });
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'nursing_handoff_created', changedById: userId, changeSummary: `Nursing handoff created for admission ${admission.admissionNumber}`, beforeData: null, afterData: JSON.stringify({ admissionId, handoffId: record.id, recipientId: recipient.id, acknowledgementDueAt }) });
      return handoffResponse((await manager.getRepository(NursingHandoff).findOne({ where: { id: record.id }, relations: { outgoingBy: true, recipient: true, acknowledgedBy: true } }))!);
    });
  },
  async acknowledgeNursingHandoff(admissionId: number, handoffId: number, userId: number | null) {
    if (!userId) throw new ValidationError('Staff identity is required');
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot acknowledge a handoff after discharge');
      const handoff = await manager.getRepository(NursingHandoff).createQueryBuilder('handoff').setLock('pessimistic_write').where('handoff.id = :handoffId AND handoff.admission_id = :admissionId', { handoffId, admissionId }).getOne();
      if (!handoff) throw new NotFoundError('Handoff not found');
      if (handoff.acknowledgedAt) throw new ConflictError('Handoff is already acknowledged');
      if (handoff.closedOnDischargeAt) throw new ConflictError('Handoff was closed on discharge');
      if (handoff.outgoingById === userId) throw new ConflictError('Outgoing staff cannot acknowledge their own handoff');
      if (handoff.recipientId && handoff.recipientId !== userId) throw new ConflictError('Handoff is assigned to another staff member');
      handoff.acknowledgedAt = new Date(); handoff.acknowledgedById = userId;
      await manager.getRepository(NursingHandoff).save(handoff);
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'nursing_handoff_acknowledged', changedById: userId, changeSummary: `Nursing handoff acknowledged for admission ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId, handoffId, acknowledged: false }), afterData: JSON.stringify({ admissionId, handoffId, acknowledged: true }) });
      return handoffResponse((await manager.getRepository(NursingHandoff).findOne({ where: { id: handoffId }, relations: { outgoingBy: true, recipient: true, acknowledgedBy: true } }))!);
    });
  },
  async dueCarePlans(page: number, pageSize: number) {
    const query = AppDataSource.getRepository(NursingCarePlan).createQueryBuilder('plan')
      .innerJoin('plan.admission', 'admission')
      .innerJoin('admission.patient', 'patient')
      .innerJoin('admission.bed', 'bed')
      .innerJoin('bed.ward', 'ward')
      .where('plan.status = :status AND plan.review_at <= :now', { status: 'active', now: new Date() })
      .andWhere('admission.status IN (:...statuses)', { statuses: ['admitted', 'transferred'] });
    const total = await query.clone().getCount();
    const items = await query.select('plan.id', 'id').addSelect('plan.admissionId', 'admissionId')
      .addSelect('plan.problem', 'problem').addSelect('plan.reviewAt', 'reviewAt')
      .addSelect('admission.admissionNumber', 'admissionNumber')
      .addSelect('patient.mrdNumber', 'patientMrdNumber')
      .addSelect("CONCAT_WS(' ', patient.firstName, patient.middleName, patient.lastName)", 'patientName')
      .addSelect('ward.name', 'wardName').addSelect('bed.number', 'bedNumber')
      .orderBy('plan.reviewAt', 'ASC').addOrderBy('plan.id', 'ASC')
      .limit(pageSize).offset((page - 1) * pageSize).getRawMany();
    return { items, total, page, pageSize };
  },
  async admissionMedicationReview(admissionId: number) {
    const admission = await AppDataSource.getRepository(Admission).findOne({ where: { id: admissionId } });
    if (!admission) throw new NotFoundError('Admission not found');
    const rows = await AppDataSource.getRepository(AdmissionHomeMedicationReview).find({ where: { admissionId }, order: { id: 'ASC' } });
    return { reviewedAt: admission.admissionMedicationsReviewedAt, reviewedById: admission.admissionMedicationsReviewedById, items: rows };
  },
  async recordAdmissionMedicationReview(admissionId: number, input: z.infer<typeof admissionMedicationReviewSchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admissionRepo = manager.getRepository(Admission);
      const admission = await admissionRepo.createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot review admission medications after discharge');
      await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :patientId', { patientId: admission.patientId }).getOneOrFail();
      const homeRows = await manager.getRepository(HomeMedication).createQueryBuilder('home').setLock('pessimistic_write').where('home.patient_id = :patientId', { patientId: admission.patientId }).andWhere('home.is_current = 1').orderBy('home.id', 'ASC').getMany();
      const reviewRepo = manager.getRepository(AdmissionHomeMedicationReview);
      const previousItems = await reviewRepo.find({ where: { admissionId } });
      const reviewedIds = new Set(previousItems.map((item) => item.homeMedicationId));
      const pendingRows = homeRows.filter((home) => !reviewedIds.has(home.id));
      if (admission.admissionMedicationsReviewedAt && pendingRows.length === 0) throw new ConflictError('No new current home medications need admission review');
      const decisions = new Map(input.homeMedicationReview.map((item) => [item.homeMedicationId, item]));
      if (decisions.size !== input.homeMedicationReview.length || decisions.size !== pendingRows.length || pendingRows.some((home) => !decisions.has(home.id))) throw new ValidationError('Review every current unreviewed home medication exactly once');
      const reviewedAt = new Date();
      for (const home of pendingRows) {
        const decision = decisions.get(home.id)!;
        if (decision.decision === 'continue') await assertNoRecordedAllergy(manager, admission.patientId, [home.medicineName]);
        await reviewRepo.save(reviewRepo.create({ admissionId, homeMedicationId: home.id, medicineName: home.medicineName, dosage: home.dosage, frequency: home.frequency, route: home.route, source: home.source, sourceDetail: home.sourceDetail, decision: decision.decision, reason: decision.decision === 'continue' ? null : decision.reason, reviewedAt, reviewedById: userId }));
      }
      const firstReview = !admission.admissionMedicationsReviewedAt;
      if (firstReview) {
        admission.admissionMedicationsReviewedAt = reviewedAt;
        admission.admissionMedicationsReviewedById = userId;
        await admissionRepo.save(admission);
      }
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: firstReview ? 'admission_medications_reviewed' : 'admission_medications_review_added', changedById: userId, changeSummary: `${firstReview ? 'Reported home medications reviewed' : 'New reported home medications reviewed'} for admission ${admission.admissionNumber}`, beforeData: null, afterData: JSON.stringify({ admissionId, decisions: pendingRows.map((home) => ({ homeMedicationId: home.id, decision: decisions.get(home.id)!.decision })) }) });
      return { reviewedAt: admission.admissionMedicationsReviewedAt, reviewedById: admission.admissionMedicationsReviewedById, items: await reviewRepo.find({ where: { admissionId }, order: { id: 'ASC' } }) };
    });
  },
  async carePlans(admissionId: number) {
    if (!(await AppDataSource.getRepository(Admission).exist({ where: { id: admissionId } }))) throw new NotFoundError('Admission not found');
    return (await AppDataSource.getRepository(NursingCarePlan).find({ where: { admissionId }, relations: { createdBy: true, closedBy: true }, order: { createdAt: 'DESC' } })).map(carePlanResponse);
  },
  async carePlanReviews(admissionId: number, planId: number) {
    if (!(await AppDataSource.getRepository(NursingCarePlan).exist({ where: { id: planId, admissionId } }))) throw new NotFoundError('Care plan not found');
    const rows = await AppDataSource.getRepository(NursingCarePlanReview).find({ where: { carePlanId: planId }, relations: { reviewedBy: true }, order: { id: 'ASC' } });
    return rows.map(({ reviewedBy, ...row }) => ({ ...row, reviewedBy: staffReference(reviewedBy) }));
  },
  async continueCarePlan(admissionId: number, planId: number, input: z.infer<typeof continueCarePlanSchema>, userId: number | null) {
    const nextReviewAt = new Date(input.nextReviewAt);
    if (nextReviewAt.getTime() <= Date.now()) throw new ValidationError('Next review time must be in the future');
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot review a care plan after discharge');
      const plan = await manager.getRepository(NursingCarePlan).createQueryBuilder('plan').setLock('pessimistic_write').where('plan.id = :planId AND plan.admission_id = :admissionId', { planId, admissionId }).getOne();
      if (!plan) throw new NotFoundError('Care plan not found');
      if (plan.status !== 'active') throw new ConflictError('Care plan is already closed');
      const previousReviewAt = plan.reviewAt;
      const review = await manager.getRepository(NursingCarePlanReview).save({ carePlanId: planId, reviewNote: input.reviewNote, previousReviewAt, nextReviewAt, reviewedById: userId });
      plan.reviewAt = nextReviewAt;
      await manager.getRepository(NursingCarePlan).save(plan);
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'care_plan_reviewed', changedById: userId, changeSummary: `Care plan reviewed for admission ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId, carePlanId: planId, reviewAt: previousReviewAt }), afterData: JSON.stringify({ admissionId, carePlanId: planId, reviewId: review.id, reviewAt: nextReviewAt }) });
      return { ...review, reviewedBy: staffReference(userId ? await manager.getRepository(User).findOne({ where: { id: userId } }) : null) };
    });
  },
  async addCarePlan(admissionId: number, input: z.infer<typeof createCarePlanSchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot create a care plan after discharge');
      const record = await manager.getRepository(NursingCarePlan).save(manager.getRepository(NursingCarePlan).create({ admissionId, problem: input.problem, goal: input.goal, interventions: input.interventions, reviewAt: input.reviewAt ? new Date(input.reviewAt) : null, createdById: userId }));
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'care_plan_created', changedById: userId, changeSummary: `Care plan created for admission ${admission.admissionNumber}`, beforeData: null, afterData: JSON.stringify({ admissionId, carePlanId: record.id, reviewAt: record.reviewAt }) });
      return carePlanResponse(await manager.getRepository(NursingCarePlan).findOne({ where: { id: record.id }, relations: { createdBy: true, closedBy: true } }));
    });
  },
  async closeCarePlan(admissionId: number, planId: number, input: z.infer<typeof closeCarePlanSchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot change a care plan after discharge');
      const plan = await manager.getRepository(NursingCarePlan).createQueryBuilder('plan').setLock('pessimistic_write').where('plan.id = :planId AND plan.admission_id = :admissionId', { planId, admissionId }).getOne();
      if (!plan) throw new NotFoundError('Care plan not found');
      if (plan.status !== 'active') throw new ConflictError('Care plan is already closed');
      plan.status = input.status; plan.reviewNote = input.reviewNote; plan.closedAt = new Date(); plan.closedById = userId;
      await manager.getRepository(NursingCarePlan).save(plan);
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'care_plan_closed', changedById: userId, changeSummary: `Care plan ${input.status} for admission ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId, carePlanId: plan.id, status: 'active' }), afterData: JSON.stringify({ admissionId, carePlanId: plan.id, status: input.status }) });
      return carePlanResponse(await manager.getRepository(NursingCarePlan).findOne({ where: { id: plan.id }, relations: { createdBy: true, closedBy: true } }));
    });
  },
  async medicationOrders(admissionId: number) {
    const admission = await AppDataSource.getRepository(Admission).findOne({ where: { id: admissionId } });
    if (!admission) throw new NotFoundError('Admission not found');
    return AppDataSource.getRepository(Prescription).find({ where: { patientId: admission.patientId, status: 'active' }, order: { createdAt: 'DESC' } });
  },
  async dischargeMedicationReview(admissionId: number) {
    const admission = await AppDataSource.getRepository(Admission).findOne({ where: { id: admissionId } });
    if (!admission) throw new NotFoundError('Admission not found');
    const rows = await AppDataSource.getRepository(DischargeMedicationReview).find({ where: { admissionId }, relations: { reviewedBy: true }, order: { id: 'ASC' } });
    const homeRows = await AppDataSource.getRepository(DischargeHomeMedicationReview).find({ where: { admissionId }, relations: { reviewedBy: true }, order: { id: 'ASC' } });
    return { medicationsReviewedAt: admission.medicationsReviewedAt, medicationsReviewedById: admission.medicationsReviewedById, items: rows.map(({ reviewedBy, ...row }) => ({ ...row, reviewedBy: staffReference(reviewedBy) })), homeItems: homeRows.map(({ reviewedBy, ...row }) => ({ ...row, reviewedBy: staffReference(reviewedBy) })) };
  },
  async medicationAdministrations(admissionId: number) {
    if (!(await AppDataSource.getRepository(Admission).exist({ where: { id: admissionId } }))) throw new NotFoundError('Admission not found');
    return (await AppDataSource.getRepository(MedicationAdministration).find({ where: { admissionId }, relations: { prescription: true, administeredBy: true }, order: { recordedAt: 'DESC' }, take: 200 })).map(medicationAdministrationResponse);
  },
  async addMedicationAdministration(admissionId: number, input: z.infer<typeof medicationAdministrationSchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot record medication after discharge');
      const prescription = await manager.getRepository(Prescription).findOne({ where: { id: input.prescriptionId, patientId: admission.patientId, status: 'active' } });
      if (!prescription) throw new ValidationError('Active prescription for this patient not found');
      if (input.outcome === 'given') {
        const medication = prescription.medicationId ? await manager.getRepository(Medication).findOne({ where: { id: prescription.medicationId } }) : null;
        await assertNoRecordedAllergy(manager, admission.patientId, [prescription.medicineName, medication?.brandName, medication?.genericName]);
      }
      const record = await manager.getRepository(MedicationAdministration).save(manager.getRepository(MedicationAdministration).create({ admissionId, prescriptionId: prescription.id, outcome: input.outcome, doseGiven: input.outcome === 'given' ? input.doseGiven ?? null : null, route: input.outcome === 'given' ? input.route ?? prescription.route : null, notes: input.notes ?? null, administeredById: userId }));
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'medication_administration_recorded', changedById: userId, changeSummary: `Medication administration recorded for admission ${admission.admissionNumber}`, beforeData: null, afterData: JSON.stringify({ admissionId, administrationId: record.id, prescriptionId: prescription.id, outcome: input.outcome }) });
      return medicationAdministrationResponse(await manager.getRepository(MedicationAdministration).findOne({ where: { id: record.id }, relations: { prescription: true, administeredBy: true } }));
    });
  },
  async transfers(admissionId: number) {
    if (!(await AppDataSource.getRepository(Admission).exist({ where: { id: admissionId } }))) throw new NotFoundError('Admission not found');
    return (await AppDataSource.getRepository(BedTransfer).find({ where: { admissionId }, relations: { fromBed: { ward: true }, toBed: { ward: true }, transferredBy: true }, order: { transferredAt: 'DESC' } })).map(transferResponse);
  },
  async transfer(id: number, input: z.infer<typeof transferBedSchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot transfer a discharged admission');
      if (admission.bedId === input.toBedId) throw new ConflictError('Patient is already in this bed');
      const bedIds = [admission.bedId, input.toBedId].sort((a, b) => a - b);
      const lockedBeds = [];
      for (const bedId of bedIds) {
        const bed = await manager.getRepository(Bed).createQueryBuilder('bed').setLock('pessimistic_write').where('bed.id = :id', { id: bedId }).getOne();
        if (!bed) throw new NotFoundError('Bed not found');
        lockedBeds.push(bed);
      }
      const fromBed = lockedBeds.find((bed) => bed.id === admission.bedId)!;
      const toBed = lockedBeds.find((bed) => bed.id === input.toBedId)!;
      if (!toBed.isActive || toBed.status !== 'available') throw new ConflictError('Destination bed is not available');
      if (fromBed.status !== 'occupied') throw new ConflictError('Current bed is not occupied');
      fromBed.status = 'available'; toBed.status = 'occupied'; admission.bedId = toBed.id;
      await manager.getRepository(Bed).save([fromBed, toBed]);
      await manager.getRepository(Admission).save(admission);
      const transfer = await manager.getRepository(BedTransfer).save(manager.getRepository(BedTransfer).create({ admissionId: id, fromBedId: fromBed.id, toBedId: toBed.id, reason: input.reason, transferredById: userId }));
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'inpatient_transferred', changedById: userId, changeSummary: `Bed transferred for admission ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId: id, bedId: fromBed.id }), afterData: JSON.stringify({ admissionId: id, transferId: transfer.id, bedId: toBed.id }) });
      return transferResponse(await manager.getRepository(BedTransfer).findOne({ where: { id: transfer.id }, relations: { fromBed: { ward: true }, toBed: { ward: true }, transferredBy: true } }));
    });
  },
  async observations(admissionId: number) {
    if (!(await AppDataSource.getRepository(Admission).exist({ where: { id: admissionId } }))) throw new NotFoundError('Admission not found');
    return (await AppDataSource.getRepository(NursingObservation).find({ where: { admissionId }, relations: { recordedBy: true }, order: { observedAt: 'DESC' }, take: 100 })).map(observationResponse);
  },
  async addObservation(admissionId: number, input: z.infer<typeof nursingObservationSchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot record observations after discharge');
      const observation = await manager.getRepository(NursingObservation).save(manager.getRepository(NursingObservation).create({ admissionId, observedAt: new Date(), temperatureC: input.temperatureC == null ? null : input.temperatureC.toFixed(1), pulseBpm: input.pulseBpm ?? null, systolicBp: input.systolicBp ?? null, diastolicBp: input.diastolicBp ?? null, spo2Percent: input.spo2Percent ?? null, notes: input.notes ?? null, recordedById: userId }));
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'nursing_observation_recorded', changedById: userId, changeSummary: `Nursing observation recorded for admission ${admission.admissionNumber}`, beforeData: null, afterData: JSON.stringify({ admissionId, observationId: observation.id }) });
      return observation;
    });
  },
  async wards() { return AppDataSource.getRepository(Ward).find({ where: { isActive: true }, relations: { beds: true }, order: { name: 'ASC' } }); },
  async beds() { return AppDataSource.getRepository(Bed).find({ where: { isActive: true }, relations: { ward: true }, order: { status: 'ASC', number: 'ASC' } }); },
  async admissions(filters: { status?: string; patientId?: number }) {
    return AppDataSource.getRepository(Admission).find({ where: { ...(filters.status ? { status: filters.status as Admission['status'] } : {}), ...(filters.patientId ? { patientId: filters.patientId } : {}) }, relations: { patient: true, bed: { ward: true }, doctor: true, department: true }, order: { admittedAt: 'DESC' } });
  },
  async admit(input: CreateAdmissionInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :id', { id: input.patientId }).getOne();
      if (!patient || !patient.isActive) throw new NotFoundError('Active patient not found');
      const activeAdmission = await manager.getRepository(Admission).createQueryBuilder('admission').where('admission.patient_id = :patientId', { patientId: input.patientId }).andWhere('admission.status <> :discharged', { discharged: 'discharged' }).getOne();
      if (activeAdmission) throw new ConflictError('Patient already has an active admission');
      const bed = await manager.getRepository(Bed).createQueryBuilder('bed').setLock('pessimistic_write').leftJoinAndSelect('bed.ward', 'ward').where('bed.id = :id', { id: input.bedId }).andWhere('bed.is_active = 1').getOne();
      if (!bed) throw new NotFoundError('Bed not found');
      if (bed.status !== 'available') throw new ConflictError('Bed is not available');
      if (input.doctorId && !(await manager.getRepository(Doctor).findOne({ where: { id: input.doctorId, isActive: true } }))) throw new ValidationError('Doctor is invalid or inactive');
      if (input.departmentId && !(await manager.getRepository(Department).findOne({ where: { id: input.departmentId, isActive: true } }))) throw new ValidationError('Department is invalid or inactive');
      const admission = manager.getRepository(Admission).create({ admissionNumber: await nextSequenceNumber(manager, 'ADM', 'ADM', 6), patientId: input.patientId, bedId: input.bedId, doctorId: input.doctorId ?? null, departmentId: input.departmentId ?? null, admittedAt: new Date(), status: 'admitted', reason: input.reason ?? null, notes: input.notes ?? null, createdById: userId });
      bed.status = 'occupied'; await manager.getRepository(Bed).save(bed);
      const saved = await manager.getRepository(Admission).save(admission);
      await manager.getRepository(PatientAuditLog).save({ patientId: patient.id, action: 'inpatient_admitted', changedById: userId, changeSummary: `Patient admitted: ${saved.admissionNumber}`, beforeData: null, afterData: JSON.stringify({ admissionId: saved.id, bedId: saved.bedId }) });
      return saved;
    });
  },
  async discharge(id: number, summary: z.infer<typeof dischargeSummarySchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Admission is already discharged');
      const previousStatus = admission.status;
      await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :patientId', { patientId: admission.patientId }).getOneOrFail();
      const prescriptionRepo = manager.getRepository(Prescription);
      const activePrescriptions = await prescriptionRepo.createQueryBuilder('prescription').setLock('pessimistic_write').where('prescription.patient_id = :patientId', { patientId: admission.patientId }).andWhere('prescription.status = :status', { status: 'active' }).orderBy('prescription.id', 'ASC').getMany();
      const decisions = new Map(summary.medicationReview.map((item) => [item.prescriptionId, item]));
      if (decisions.size !== summary.medicationReview.length || decisions.size !== activePrescriptions.length || activePrescriptions.some((prescription) => !decisions.has(prescription.id))) throw new ValidationError('Review every active prescription exactly once before discharge');
      const homeRepo = manager.getRepository(HomeMedication);
      const activeHomeMedications = await homeRepo.createQueryBuilder('home').setLock('pessimistic_write').where('home.patient_id = :patientId', { patientId: admission.patientId }).andWhere('home.is_current = 1').orderBy('home.id', 'ASC').getMany();
      const homeDecisions = new Map(summary.homeMedicationReview.map((item) => [item.homeMedicationId, item]));
      if (homeDecisions.size !== summary.homeMedicationReview.length || homeDecisions.size !== activeHomeMedications.length || activeHomeMedications.some((home) => !homeDecisions.has(home.id))) throw new ValidationError('Review every current home medication exactly once before discharge');
      const admissionHomeReviews = await manager.getRepository(AdmissionHomeMedicationReview).find({ where: { admissionId: id } });
      const admissionHomeDecisions = new Map(admissionHomeReviews.map((item) => [item.homeMedicationId, item.decision]));
      const bed = await manager.getRepository(Bed).createQueryBuilder('bed').setLock('pessimistic_write').where('bed.id = :id', { id: admission.bedId }).getOne();
      if (!bed) throw new NotFoundError('Bed not found');
      const reviewedAt = new Date();
      const reviewRepo = manager.getRepository(DischargeMedicationReview);
      for (const prescription of activePrescriptions) {
        const decision = decisions.get(prescription.id)!;
        if (decision.decision === 'continue') {
          const medication = prescription.medicationId ? await manager.getRepository(Medication).findOne({ where: { id: prescription.medicationId } }) : null;
          await assertNoRecordedAllergy(manager, admission.patientId, [prescription.medicineName, medication?.brandName, medication?.genericName]);
        }
        await reviewRepo.save(reviewRepo.create({ admissionId: id, prescriptionId: prescription.id, medicineName: prescription.medicineName, dosage: prescription.dosage, frequency: prescription.frequency, route: prescription.route, decision: decision.decision, instructions: decision.decision === 'continue' ? decision.instructions : null, reason: decision.decision === 'stop' ? decision.reason : null, reviewedById: userId, reviewedAt }));
        if (decision.decision === 'stop') { prescription.status = 'stopped'; await prescriptionRepo.save(prescription); }
      }
      const homeReviewRepo = manager.getRepository(DischargeHomeMedicationReview);
      for (const home of activeHomeMedications) {
        const decision = homeDecisions.get(home.id)!;
        if (decision.decision === 'continue') await assertNoRecordedAllergy(manager, admission.patientId, [home.medicineName]);
        const changedFromHoldOrStop = admissionHomeDecisions.get(home.id) === 'hold' || admissionHomeDecisions.get(home.id) === 'stop';
        if (decision.decision === 'continue' && changedFromHoldOrStop && !decision.changeReason) throw new ValidationError(`Explain why ${home.medicineName} is continued after being held or stopped at admission`);
        await homeReviewRepo.save(homeReviewRepo.create({ admissionId: id, homeMedicationId: home.id, medicineName: home.medicineName, dosage: home.dosage, frequency: home.frequency, route: home.route, source: home.source, sourceDetail: home.sourceDetail, decision: decision.decision, instructions: decision.decision === 'continue' ? decision.instructions : null, reason: decision.decision === 'stop' ? decision.reason : null, changeReason: decision.decision === 'continue' && changedFromHoldOrStop ? decision.changeReason ?? null : null, reviewedById: userId, reviewedAt }));
        if (decision.decision === 'stop') { home.isCurrent = false; home.ceasedAt = reviewedAt; home.ceasedById = userId; home.cessationReason = decision.reason; await homeRepo.save(home); }
      }
      admission.status = 'discharged'; admission.dischargedAt = reviewedAt; admission.medicationsReviewedAt = reviewedAt; admission.medicationsReviewedById = userId; bed.status = 'available'; admission.dischargeSummary = summary.dischargeSummary; admission.dischargeDiagnosis = summary.dischargeDiagnosis ?? null; admission.dischargeMedications = summary.dischargeMedications ?? null; admission.followUpInstructions = summary.followUpInstructions ?? null; admission.dischargedById = userId;
      const pendingHandoffs = await manager.getRepository(NursingHandoff).createQueryBuilder('handoff').setLock('pessimistic_write').where('handoff.admission_id = :admissionId AND handoff.acknowledged_at IS NULL AND handoff.closed_on_discharge_at IS NULL', { admissionId: id }).getMany();
      for (const handoff of pendingHandoffs) {
        handoff.closedOnDischargeAt = reviewedAt; handoff.closedOnDischargeById = userId;
        await manager.getRepository(NursingHandoff).save(handoff);
        await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'nursing_handoff_closed', changedById: userId, changeSummary: `Pending handoff closed on discharge for admission ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId: id, handoffId: handoff.id, status: 'pending' }), afterData: JSON.stringify({ admissionId: id, handoffId: handoff.id, status: 'closed_on_discharge' }) });
      }
      await manager.getRepository(Admission).save(admission); await manager.getRepository(Bed).save(bed);
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'inpatient_discharged', changedById: userId, changeSummary: `Admission discharged with medication review: ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId: id, status: previousStatus }), afterData: JSON.stringify({ admissionId: id, medicationReview: activePrescriptions.map((prescription) => ({ prescriptionId: prescription.id, decision: decisions.get(prescription.id)!.decision })), homeMedicationReview: activeHomeMedications.map((home) => ({ homeMedicationId: home.id, decision: homeDecisions.get(home.id)!.decision })) }) });
      return manager.getRepository(Admission).findOne({ where: { id }, relations: { patient: true, bed: { ward: true }, doctor: true, department: true } });
    });
  },
};
