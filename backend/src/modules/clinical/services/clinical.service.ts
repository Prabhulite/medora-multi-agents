import { AppDataSource } from '../../../config/data-source.js';
import { ClinicalEncounter, ClinicalEncounterAddendum, DiagnosisTerm, Doctor, Patient, PatientAuditLog, PatientVisit } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import type { CreateClinicalEncounterInput, CreateEncounterAddendumInput } from '../validators/clinical.validators.js';

export const clinicalService = {
  async listByPatient(patientId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    const rows = await AppDataSource.getRepository(ClinicalEncounter).find({
      where: { patientId },
      relations: { doctor: true, visit: true, createdBy: true, signedBy: true, addenda: { createdBy: true } },
      order: { createdAt: 'DESC' },
    });
    for (const row of rows) row.addenda?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return rows;
  },

  async create(input: CreateClinicalEncounterInput, userId: number | null) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: input.patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    if (input.visitId) {
      const visit = await AppDataSource.getRepository(PatientVisit).findOne({ where: { id: input.visitId, patientId: input.patientId } });
      if (!visit) throw new ValidationError('Visit does not belong to this patient');
    }
    if (input.doctorId) {
      const doctor = await AppDataSource.getRepository(Doctor).findOne({ where: { id: input.doctorId, isActive: true } });
      if (!doctor) throw new ValidationError('Doctor is invalid or inactive');
    }
    return AppDataSource.transaction(async (manager) => {
      const diagnosisTerm = input.diagnosisTermId
        ? await manager.getRepository(DiagnosisTerm).findOne({ where: { id: input.diagnosisTermId, isActive: true } })
        : null;
      if (input.diagnosisTermId && !diagnosisTerm) throw new ValidationError('Diagnosis term is invalid or inactive');
      const encounter = await manager.getRepository(ClinicalEncounter).save(manager.getRepository(ClinicalEncounter).create({
        ...input,
        status: 'draft',
        signedAt: null,
        signedById: null,
        createdById: userId,
        complaints: input.complaints ?? null,
        examination: input.examination ?? null,
        assessment: input.assessment ?? null,
        plan: input.plan ?? null,
        diagnosisCode: diagnosisTerm?.code ?? input.diagnosisCode ?? null,
        diagnosisSystem: diagnosisTerm?.system ?? null,
        diagnosisTermId: diagnosisTerm?.id ?? null,
        diagnosisVersion: diagnosisTerm?.version ?? null,
        diagnosisName: diagnosisTerm?.name ?? input.diagnosisName ?? null,
        vitals: input.vitals ?? null,
      }));
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({
        patientId: input.patientId,
        action: 'encounter_created',
        changedById: userId,
        changeSummary: `Clinical encounter created: ${encounter.id}`,
        beforeData: null,
        afterData: JSON.stringify({ id: encounter.id, visitId: encounter.visitId, doctorId: encounter.doctorId, diagnosisTermId: encounter.diagnosisTermId, diagnosisCode: encounter.diagnosisCode, diagnosisSystem: encounter.diagnosisSystem, diagnosisVersion: encounter.diagnosisVersion, diagnosisName: encounter.diagnosisName, status: encounter.status }),
      }));
      return encounter;
    });
  },
  async sign(id: number, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const encounter = await manager.getRepository(ClinicalEncounter).createQueryBuilder('encounter').setLock('pessimistic_write').where('encounter.id = :id', { id }).getOne();
      if (!encounter) throw new NotFoundError('Clinical encounter not found');
      if (encounter.status !== 'draft') throw new ConflictError('Clinical encounter is already finalized');
      if (![encounter.complaints, encounter.examination, encounter.assessment, encounter.plan, encounter.diagnosisName].some((value) => Boolean(value?.trim()))) throw new ValidationError('Add clinical content before signing');
      encounter.status = 'signed'; encounter.signedAt = new Date(); encounter.signedById = userId;
      await manager.getRepository(ClinicalEncounter).save(encounter);
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId: encounter.patientId, action: 'encounter_signed', changedById: userId, changeSummary: `Clinical encounter signed: ${encounter.id}`, beforeData: JSON.stringify({ id: encounter.id, status: 'draft' }), afterData: JSON.stringify({ id: encounter.id, status: 'signed', signedAt: encounter.signedAt }) }));
      return encounter;
    });
  },
  async addAddendum(id: number, input: CreateEncounterAddendumInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const encounter = await manager.getRepository(ClinicalEncounter).createQueryBuilder('encounter').setLock('pessimistic_write').where('encounter.id = :id', { id }).getOne();
      if (!encounter) throw new NotFoundError('Clinical encounter not found');
      if (encounter.status === 'draft' || !encounter.signedAt) throw new ConflictError('Sign the encounter before adding an addendum');
      const previousStatus = encounter.status;
      const addendum = await manager.getRepository(ClinicalEncounterAddendum).save(manager.getRepository(ClinicalEncounterAddendum).create({ encounterId: id, reason: input.reason, addendum: input.addendum, createdById: userId }));
      encounter.status = 'amended';
      await manager.getRepository(ClinicalEncounter).save(encounter);
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId: encounter.patientId, action: 'encounter_amended', changedById: userId, changeSummary: `Addendum added to clinical encounter: ${id}`, beforeData: JSON.stringify({ encounterId: id, status: previousStatus }), afterData: JSON.stringify({ encounterId: id, addendumId: addendum.id, reason: addendum.reason }) }));
      return addendum;
    });
  },
};
