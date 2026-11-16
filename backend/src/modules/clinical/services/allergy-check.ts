import type { EntityManager } from 'typeorm';
import { PatientAllergy } from '../../../database/entities/index.js';
import { ConflictError } from '../../../shared/errors/AppError.js';

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');

export async function assertNoRecordedAllergy(manager: EntityManager, patientId: number, medicineNames: Array<string | null | undefined>) {
  const names = medicineNames.filter((value): value is string => Boolean(value)).map(normalize);
  const allergies = await manager.getRepository(PatientAllergy).find({ where: { patientId } });
  const match = allergies.find((allergy) => names.includes(normalize(allergy.allergen)));
  if (match) throw new ConflictError(`Recorded allergy to ${match.allergen}. Review the patient's allergy record before proceeding.`);
}
