import { AppDataSource } from '../../../config/data-source.js';
import { ClinicalEncounter, ClinicalEncounterAddendum, DiagnosisTerm, Doctor, Patient, PatientAuditLog, PatientVisit } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import type { CreateClinicalEncounterInput, CreateEncounterAddendumInput, UpdateClinicalEncounterInput } from '../validators/clinical.validators.js';

export const clinicalService = {
  async listByPatient(patientId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    const rows = await AppDataSource.getRepository(ClinicalEncounter).find({
      where: { patientId },
      relations: { doctor: true, visit: true, createdBy: true, signedBy: true, addenda: { createdBy: true } },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      ...row,
      createdBy: row.createdBy ? { id: row.createdBy.id, fullName: row.createdBy.fullName } : null,
      signedBy: row.signedBy ? { id: row.signedBy.id, fullName: row.signedBy.fullName } : null,
      addenda: row.addenda?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((item) => ({
        ...item,
        createdBy: item.createdBy ? { id: item.createdBy.id, fullName: item.createdBy.fullName } : null,
      })),
    }));
  },

  async create(input: CreateClinicalEncounterInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient').setLock('pessimistic_write').where('patient.id = :id', { id: input.patientId }).getOne();
      if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      let visitDoctorId: number | null = null;
      if (input.visitId) {
        const visit = await manager.getRepository(PatientVisit).findOne({ where: { id: input.visitId, patientId: input.patientId } });
        if (!visit) throw new ValidationError('Visit does not belong to this patient');
        visitDoctorId = visit.doctorId;
        if (input.doctorId && visitDoctorId && input.doctorId !== visitDoctorId) throw new ValidationError('Doctor does not match the visit');
      }
      if (input.doctorId) {
        const doctor = await manager.getRepository(Doctor).findOne({ where: { id: input.doctorId, isActive: true } });
        if (!doctor) throw new ValidationError('Doctor is invalid or inactive');
      }
      const diagnosisTerm = input.diagnosisTermId
        ? await manager.getRepository(DiagnosisTerm).findOne({ where: { id: input.diagnosisTermId, isActive: true } })
        : null;
      if (input.diagnosisTermId && !diagnosisTerm) throw new ValidationError('Diagnosis term is invalid or inactive');
      const encounter = await manager.getRepository(ClinicalEncounter).save(manager.getRepository(ClinicalEncounter).create({
        ...input,
        doctorId: visitDoctorId ?? input.doctorId ?? null,
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
  async update(id: number, input: UpdateClinicalEncounterInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ClinicalEncounter);
      const encounter = await repository.createQueryBuilder('encounter').setLock('pessimistic_write').where('encounter.id = :id', { id }).getOne();
      if (!encounter) throw new NotFoundError('Clinical encounter not found');
      if (encounter.status !== 'draft') throw new ConflictError('Clinical encounter is finalized');
      if (encounter.revision !== input.expectedRevision) throw new ConflictError('Clinical encounter revision is stale');
      const fields = ['complaints', 'examination', 'assessment', 'plan', 'diagnosisTermId', 'diagnosisName', 'vitals'] as const;
      const beforeValues = Object.fromEntries(fields.map((field) => [field, encounter[field]]));
      const beforeDiagnosis = { diagnosisTermId: encounter.diagnosisTermId, diagnosisCode: encounter.diagnosisCode, diagnosisSystem: encounter.diagnosisSystem, diagnosisVersion: encounter.diagnosisVersion };
      for (const field of ['complaints', 'examination', 'assessment', 'plan'] as const) {
        if (input[field] !== undefined) encounter[field] = input[field];
      }
      if (input.vitals !== undefined) encounter.vitals = input.vitals;
      if (input.diagnosisTermId === null) {
        encounter.diagnosisTermId = null;
        encounter.diagnosisCode = null;
        encounter.diagnosisSystem = null;
        encounter.diagnosisVersion = null;
        encounter.diagnosisName = input.diagnosisName ?? null;
      } else if (input.diagnosisTermId !== undefined && input.diagnosisTermId !== encounter.diagnosisTermId) {
        const term = await manager.getRepository(DiagnosisTerm).findOne({ where: { id: input.diagnosisTermId, isActive: true } });
        if (!term) throw new ValidationError('Diagnosis term is invalid or inactive');
        encounter.diagnosisTermId = term.id;
        encounter.diagnosisCode = term.code;
        encounter.diagnosisSystem = term.system;
        encounter.diagnosisVersion = term.version;
        encounter.diagnosisName = term.name;
      } else if (input.diagnosisName !== undefined && encounter.diagnosisTermId === null) {
        encounter.diagnosisName = input.diagnosisName;
      }
      const changedFields = fields.filter((field) => JSON.stringify(beforeValues[field]) !== JSON.stringify(encounter[field]));
      if (!changedFields.length) throw new ValidationError('No draft changes to save');
      encounter.revision += 1;
      await repository.save(encounter);
      await manager.getRepository(PatientAuditLog).save({
        patientId: encounter.patientId, action: 'encounter_updated', changedById: userId,
        changeSummary: `Clinical encounter updated: ${encounter.id}`,
        beforeData: JSON.stringify({ encounterId: id, revision: input.expectedRevision, ...beforeDiagnosis }),
        afterData: JSON.stringify({ encounterId: id, revision: encounter.revision, changedFields, diagnosisTermId: encounter.diagnosisTermId, diagnosisCode: encounter.diagnosisCode, diagnosisSystem: encounter.diagnosisSystem, diagnosisVersion: encounter.diagnosisVersion }),
      });
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
