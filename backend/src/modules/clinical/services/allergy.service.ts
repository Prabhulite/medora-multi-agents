import { AppDataSource } from '../../../config/data-source.js';
import { Patient, PatientAllergy, PatientAuditLog } from '../../../database/entities/index.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import type { CreateAllergyInput } from '../validators/clinical.validators.js';

const normalized = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

export const allergyService = {
  async list(patientId: number) {
    if (!await AppDataSource.getRepository(Patient).exist({ where: { id: patientId, isActive: true } })) throw new NotFoundError('Patient not found');
    return AppDataSource.getRepository(PatientAllergy).find({ where: { patientId }, order: { createdAt: 'DESC' } });
  },
  async create(patientId: number, input: CreateAllergyInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      if (!await manager.getRepository(Patient).exist({ where: { id: patientId, isActive: true } })) throw new NotFoundError('Patient not found');
      const existing = await manager.getRepository(PatientAllergy).find({ where: { patientId } });
      if (existing.some((row) => normalized(row.allergen) === normalized(input.allergen))) throw new ConflictError('Allergy already recorded for this patient');
      const allergy = await manager.getRepository(PatientAllergy).save(manager.getRepository(PatientAllergy).create({ patientId, allergen: input.allergen, reaction: input.reaction ?? null, severity: input.severity ?? null, notes: input.notes ?? null }));
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'allergy_added', changedById: userId, changeSummary: `Allergy recorded: ${allergy.allergen}`, beforeData: null, afterData: JSON.stringify({ id: allergy.id, allergen: allergy.allergen, reaction: allergy.reaction, severity: allergy.severity }) }));
      return allergy;
    });
  },
  async remove(patientId: number, allergyId: number, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const allergy = await manager.getRepository(PatientAllergy).findOne({ where: { id: allergyId, patientId } });
      if (!allergy) throw new NotFoundError('Allergy record not found');
      await manager.getRepository(PatientAuditLog).save(manager.getRepository(PatientAuditLog).create({ patientId, action: 'allergy_removed', changedById: userId, changeSummary: `Allergy removed: ${allergy.allergen}`, beforeData: JSON.stringify({ id: allergy.id, allergen: allergy.allergen, reaction: allergy.reaction, severity: allergy.severity }), afterData: null }));
      await manager.getRepository(PatientAllergy).remove(allergy);
      return null;
    });
  },
};
