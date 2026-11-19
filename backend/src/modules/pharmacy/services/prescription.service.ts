import { AppDataSource } from '../../../config/data-source.js';
import { ClinicalEncounter, Medication, Patient, PatientAuditLog, Prescription } from '../../../database/entities/index.js';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError.js';
import { assertNoRecordedAllergy } from '../../clinical/services/allergy-check.js';
import type { CreatePrescriptionInput } from '../validators/prescription.validators.js';

export const prescriptionService = {
  listMedications() { return AppDataSource.getRepository(Medication).find({ where: { isActive: true }, order: { brandName: 'ASC' } }); },
  async pendingDispense() {
    const rows = await AppDataSource.query(`
      SELECT rx.id, rx.patient_id AS patientId, rx.medicine_name AS medicineName,
        rx.quantity_prescribed AS quantityPrescribed, rx.created_at AS createdAt,
        p.mrd_number AS patientNumber, TRIM(CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name)) AS patientName,
        COALESCE(issued.dispensed, 0) AS dispensedQuantity
      FROM prescriptions rx
      JOIN patients p ON p.id = rx.patient_id AND p.is_active = 1 AND p.merged_into_patient_id IS NULL
      LEFT JOIN (
        SELECT prescription_id, SUM(-quantity) AS dispensed FROM stock_transactions
        WHERE type = 'dispense' AND prescription_id IS NOT NULL GROUP BY prescription_id
      ) issued ON issued.prescription_id = rx.id
      WHERE rx.status = 'active' AND rx.medication_id IS NOT NULL AND rx.quantity_prescribed IS NOT NULL
        AND rx.quantity_prescribed > COALESCE(issued.dispensed, 0)
      ORDER BY rx.created_at DESC, rx.id DESC LIMIT 100
    `) as Array<{ id: number; patientId: number; medicineName: string; quantityPrescribed: number; createdAt: Date; patientNumber: string; patientName: string; dispensedQuantity: string }>;
    return rows.map((row) => ({ ...row, remainingQuantity: Number(row.quantityPrescribed) - Number(row.dispensedQuantity) }));
  },
  async listByPatient(patientId: number) {
    const patient = await AppDataSource.getRepository(Patient).findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
    const { entities, raw } = await AppDataSource.getRepository(Prescription)
      .createQueryBuilder('rx')
      .leftJoinAndSelect('rx.medication', 'medication')
      .leftJoinAndSelect('rx.encounter', 'encounter')
      .leftJoin('rx.createdBy', 'author')
      .leftJoin('encounter.doctor', 'doctor')
      .leftJoin('doctor_master', 'authorDoctor', 'authorDoctor.account_user_id = rx.created_by_id')
      .addSelect('author.full_name', 'authorName')
      .addSelect('doctor.name', 'doctorName')
      .addSelect('doctor.medical_registration_number', 'doctorRegistration')
      .addSelect('authorDoctor.name', 'authorDoctorName')
      .addSelect('authorDoctor.medical_registration_number', 'authorDoctorRegistration')
      .where('rx.patient_id = :patientId', { patientId })
      .orderBy('rx.created_at', 'DESC')
      .getRawAndEntities<{ rx_id: number; authorName: string | null; doctorName: string | null; doctorRegistration: string | null; authorDoctorName: string | null; authorDoctorRegistration: string | null }>();
    const details = new Map(raw.map((row) => [row.rx_id, row]));
    return entities.map((prescription) => {
      const row = details.get(prescription.id);
      return {
        ...prescription,
        prescriberName: row?.authorDoctorName ?? row?.doctorName ?? row?.authorName ?? null,
        prescriberRegistration: row?.authorDoctorRegistration ?? row?.doctorRegistration ?? null,
      };
    });
  },
  async create(input: CreatePrescriptionInput, userId: number | null) {
    return AppDataSource.transaction(async (manager) => {
      const patient = await manager.getRepository(Patient).createQueryBuilder('patient')
        .setLock('pessimistic_write')
        .where('patient.id = :id', { id: input.patientId })
        .getOne();
      if (!patient || !patient.isActive || patient.mergedIntoPatientId) throw new NotFoundError('Active patient not found');
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
