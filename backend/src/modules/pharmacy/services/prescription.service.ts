import { AppDataSource } from '../../../config/data-source.js';
import { ClinicalEncounter, Medication, Patient, PatientAuditLog, Prescription } from '../../../database/entities/index.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { assertNoRecordedAllergy } from '../../clinical/services/allergy-check.js';
import type { CreatePrescriptionInput } from '../validators/prescription.validators.js';

export const prescriptionService = {
  listMedications() { return AppDataSource.getRepository(Medication).find({ where: { isActive: true }, order: { brandName: 'ASC' } }); },
  async listByPatient(patientId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    return AppDataSource.getRepository(Prescription).find({
      where: { patientId }, relations: { medication: true, encounter: true }, order: { createdAt: 'DESC' },
    });
  },
  async create(input: CreatePrescriptionInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).findOne({ where: { id: input.patientId, isActive: true } });
      if (!patient || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
      if (input.encounterId) {
        const encounter = await manager.getRepository(ClinicalEncounter).findOne({ where: { id: input.encounterId, patientId: input.patientId } });
        if (!encounter) throw new ValidationError('Encounter does not belong to this patient');
      }
      let medication: Medication | null = null;
      if (input.medicationId) {
        medication = await manager.getRepository(Medication).findOne({ where: { id: input.medicationId, isActive: true } });
        if (!medication) throw new ValidationError('Medication is invalid or inactive');
      }
      await assertNoRecordedAllergy(manager, input.patientId, [input.medicineName, medication?.brandName, medication?.genericName]);
      const prescription = await manager.getRepository(Prescription).save(manager.getRepository(Prescription).create({
        ...input, createdById: userId, dosage: input.dosage ?? null, frequency: input.frequency ?? null,
        durationDays: input.durationDays ?? null, quantityPrescribed: input.quantityPrescribed ?? null, instructions: input.instructions ?? null,
      }));
      await manager.getRepository(PatientAuditLog).save({ patientId: input.patientId, action: 'prescription_created', changedById: userId, changeSummary: `Prescription created: #${prescription.id}`, beforeData: null, afterData: JSON.stringify({ prescriptionId: prescription.id, encounterId: prescription.encounterId, medicationId: prescription.medicationId, quantityPrescribed: prescription.quantityPrescribed }) });
      return prescription;
    });
  },
};
