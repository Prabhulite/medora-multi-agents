import { AppDataSource } from '../../../config/data-source.js';
import { Admission, Bed, BedTransfer, Department, DischargeHomeMedicationReview, DischargeMedicationReview, Doctor, HomeMedication, MedicationAdministration, NursingCarePlan, NursingObservation, Patient, PatientAuditLog, Prescription, Ward, Medication, User } from '../../../database/entities/index.js';
import { assertNoRecordedAllergy } from '../../clinical/services/allergy-check.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { nextSequenceNumber } from '../../patients/services/number-sequence.service.js';
import type { CreateAdmissionInput } from '../validators/inpatient.validators.js';
import type { z } from 'zod';
import { closeCarePlanSchema, createCarePlanSchema, dischargeSummarySchema, medicationAdministrationSchema, nursingObservationSchema, transferBedSchema } from '../validators/inpatient.validators.js';

function carePlanResponse(plan: NursingCarePlan | null) {
  if (!plan) throw new NotFoundError('Care plan not found');
  const { createdBy, closedBy, ...fields } = plan;
  return { ...fields, createdBy: createdBy ? { fullName: createdBy.fullName } : null, closedBy: closedBy ? { fullName: closedBy.fullName } : null };
}

const staffReference = (user: User | null | undefined) => user ? { id: user.id, fullName: user.fullName } : null;
const medicationAdministrationResponse = (row: MedicationAdministration | null) => row ? { ...row, administeredBy: staffReference(row.administeredBy) } : null;
const transferResponse = (row: BedTransfer | null) => row ? { ...row, transferredBy: staffReference(row.transferredBy) } : null;
const observationResponse = (row: NursingObservation) => ({ ...row, recordedBy: staffReference(row.recordedBy) });

export const inpatientService = {
  async carePlans(admissionId: number) {
    if (!(await AppDataSource.getRepository(Admission).exist({ where: { id: admissionId } }))) throw new NotFoundError('Admission not found');
    return (await AppDataSource.getRepository(NursingCarePlan).find({ where: { admissionId }, relations: { createdBy: true, closedBy: true }, order: { createdAt: 'DESC' } })).map(carePlanResponse);
  },
  async addCarePlan(admissionId: number, input: z.infer<typeof createCarePlanSchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id: admissionId }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Cannot create a care plan after discharge');
      const record = await manager.getRepository(NursingCarePlan).save(manager.getRepository(NursingCarePlan).create({ admissionId, problem: input.problem, goal: input.goal, interventions: input.interventions, reviewAt: input.reviewAt ? new Date(input.reviewAt) : null, createdById: userId }));
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
      return manager.getRepository(NursingObservation).save(manager.getRepository(NursingObservation).create({ admissionId, observedAt: new Date(), temperatureC: input.temperatureC == null ? null : input.temperatureC.toFixed(1), pulseBpm: input.pulseBpm ?? null, systolicBp: input.systolicBp ?? null, diastolicBp: input.diastolicBp ?? null, spo2Percent: input.spo2Percent ?? null, notes: input.notes ?? null, recordedById: userId }));
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
      return manager.getRepository(Admission).save(admission);
    });
  },
  async discharge(id: number, summary: z.infer<typeof dischargeSummarySchema>, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const admission = await manager.getRepository(Admission).createQueryBuilder('admission').setLock('pessimistic_write').where('admission.id = :id', { id }).getOne();
      if (!admission) throw new NotFoundError('Admission not found');
      if (admission.status === 'discharged') throw new ConflictError('Admission is already discharged');
      const previousStatus = admission.status;
      const prescriptionRepo = manager.getRepository(Prescription);
      const activePrescriptions = await prescriptionRepo.createQueryBuilder('prescription').setLock('pessimistic_write').where('prescription.patient_id = :patientId', { patientId: admission.patientId }).andWhere('prescription.status = :status', { status: 'active' }).orderBy('prescription.id', 'ASC').getMany();
      const decisions = new Map(summary.medicationReview.map((item) => [item.prescriptionId, item]));
      if (decisions.size !== summary.medicationReview.length || decisions.size !== activePrescriptions.length || activePrescriptions.some((prescription) => !decisions.has(prescription.id))) throw new ValidationError('Review every active prescription exactly once before discharge');
      const homeRepo = manager.getRepository(HomeMedication);
      const activeHomeMedications = await homeRepo.createQueryBuilder('home').setLock('pessimistic_write').where('home.patient_id = :patientId', { patientId: admission.patientId }).andWhere('home.is_current = 1').orderBy('home.id', 'ASC').getMany();
      const homeDecisions = new Map(summary.homeMedicationReview.map((item) => [item.homeMedicationId, item]));
      if (homeDecisions.size !== summary.homeMedicationReview.length || homeDecisions.size !== activeHomeMedications.length || activeHomeMedications.some((home) => !homeDecisions.has(home.id))) throw new ValidationError('Review every current home medication exactly once before discharge');
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
        await homeReviewRepo.save(homeReviewRepo.create({ admissionId: id, homeMedicationId: home.id, medicineName: home.medicineName, dosage: home.dosage, frequency: home.frequency, route: home.route, source: home.source, sourceDetail: home.sourceDetail, decision: decision.decision, instructions: decision.decision === 'continue' ? decision.instructions : null, reason: decision.decision === 'stop' ? decision.reason : null, reviewedById: userId, reviewedAt }));
        if (decision.decision === 'stop') { home.isCurrent = false; home.ceasedAt = reviewedAt; home.ceasedById = userId; home.cessationReason = decision.reason; await homeRepo.save(home); }
      }
      admission.status = 'discharged'; admission.dischargedAt = reviewedAt; admission.medicationsReviewedAt = reviewedAt; admission.medicationsReviewedById = userId; bed.status = 'available'; admission.dischargeSummary = summary.dischargeSummary; admission.dischargeDiagnosis = summary.dischargeDiagnosis ?? null; admission.dischargeMedications = summary.dischargeMedications ?? null; admission.followUpInstructions = summary.followUpInstructions ?? null; admission.dischargedById = userId;
      await manager.getRepository(Admission).save(admission); await manager.getRepository(Bed).save(bed);
      await manager.getRepository(PatientAuditLog).save({ patientId: admission.patientId, action: 'inpatient_discharged', changedById: userId, changeSummary: `Admission discharged with medication review: ${admission.admissionNumber}`, beforeData: JSON.stringify({ admissionId: id, status: previousStatus }), afterData: JSON.stringify({ admissionId: id, medicationReview: activePrescriptions.map((prescription) => ({ prescriptionId: prescription.id, decision: decisions.get(prescription.id)!.decision })), homeMedicationReview: activeHomeMedications.map((home) => ({ homeMedicationId: home.id, decision: homeDecisions.get(home.id)!.decision })) }) });
      return manager.getRepository(Admission).findOne({ where: { id }, relations: { patient: true, bed: { ward: true }, doctor: true, department: true } });
    });
  },
};
