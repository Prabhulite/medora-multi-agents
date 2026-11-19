import { AppDataSource } from '../../config/data-source.js';
import { Patient } from '../../database/entities/Patient.js';
import { PatientImmunization } from '../../database/entities/PatientImmunization.js';
import { Vaccine } from '../../database/entities/Vaccine.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors/AppError.js';
import type { z } from 'zod';
import type { catalogSchema, recordSchema, reportSchema } from './vaccination.validators.js';

type CatalogInput = z.infer<typeof catalogSchema>;
type RecordInput = z.infer<typeof recordSchema>;
type ReportInput = z.infer<typeof reportSchema>;

export const vaccinationService = {
  catalog() { return AppDataSource.getRepository(Vaccine).find({ order: { name: 'ASC' } }); },
  async addVaccine(input: CatalogInput) {
    const repo = AppDataSource.getRepository(Vaccine);
    if (await repo.exist({ where: { code: input.code } })) throw new ConflictError('Vaccine code already exists');
    return repo.save(repo.create(input));
  },
  async records(patientId?: number) {
    const qb = AppDataSource.getRepository(PatientImmunization).createQueryBuilder('r')
      .innerJoin(Patient, 'p', 'p.id = r.patient_id')
      .innerJoin(Vaccine, 'v', 'v.id = r.vaccine_id')
      .select(['r.id AS id', 'r.patient_id AS patientId', 'p.mrd_number AS mrdNumber', 'p.first_name AS firstName', 'p.last_name AS lastName', 'r.vaccine_id AS vaccineId', 'v.name AS vaccineName', 'r.dose_number AS doseNumber', 'r.administered_on AS administeredOn', 'r.next_due_on AS nextDueOn', 'r.lotNumber AS lotNumber', 'r.remarks AS remarks'])
      .orderBy('r.administered_on', 'DESC').addOrderBy('r.id', 'DESC').limit(500);
    if (patientId) qb.where('r.patient_id = :patientId', { patientId });
    return qb.getRawMany();
  },
  async addRecord(input: RecordInput, userId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOneBy({ id: input.patientId });
    if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
    const vaccine = await AppDataSource.getRepository(Vaccine).findOneBy({ id: input.vaccineId });
    if (!vaccine || !vaccine.isActive) throw new NotFoundError('Active vaccine not found');
    if (input.administeredOn > new Date().toISOString().slice(0, 10)) throw new ValidationError('Administration date cannot be in the future');
    const repo = AppDataSource.getRepository(PatientImmunization);
    if (await repo.exist({ where: { patientId: input.patientId, vaccineId: input.vaccineId, doseNumber: input.doseNumber } })) throw new ConflictError('This dose is already recorded for the patient');
    try { return await repo.save(repo.create({ ...input, nextDueOn: input.nextDueOn || null, lotNumber: input.lotNumber || null, remarks: input.remarks || null, recordedByUserId: userId })); }
    catch (error) { if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new ConflictError('This dose is already recorded for the patient'); throw error; }
  },
  async report(input: ReportInput) {
    const qb = AppDataSource.getRepository(PatientImmunization).createQueryBuilder('r')
      .innerJoin(Patient, 'p', 'p.id = r.patient_id').innerJoin(Vaccine, 'v', 'v.id = r.vaccine_id')
      .select(['r.id AS id', 'p.mrd_number AS mrdNumber', 'p.first_name AS firstName', 'p.last_name AS lastName', 'v.name AS vaccineName', 'r.dose_number AS doseNumber', 'r.administered_on AS administeredOn', 'r.next_due_on AS nextDueOn'])
      .orderBy('r.administered_on', 'DESC').addOrderBy('r.id', 'DESC').limit(1000);
    if (input.from) qb.andWhere('r.administered_on >= :from', { from: input.from });
    if (input.to) qb.andWhere('r.administered_on <= :to', { to: input.to });
    if (input.vaccineId) qb.andWhere('r.vaccine_id = :vaccineId', { vaccineId: input.vaccineId });
    return qb.getRawMany();
  },
};
