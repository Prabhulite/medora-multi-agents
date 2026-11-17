import 'reflect-metadata';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import {
  Appointment,
  AppointmentStatusHistory,
  ClinicalEncounter,
  DiagnosisTerm,
  ClinicalEncounterAddendum,
  Medication,
  Prescription,
  Ward,
  Bed,
  Admission,
  BedTransfer,
  MedicationAdministration,
  Refund,
  EmergencyCase,
  OperatingRoom,
  SurgeryCase,
  NursingCarePlan,
  InsuranceClaim,
  ChargeMaster,
  DutyShift,
  AmbulanceVehicle,
  AmbulanceTrip,
  AmbulanceDriver,
  NursingObservation,
  Invoice,
  InvoiceItem,
  Payment,
  InventoryBatch,
  StockTransaction,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  LaboratoryTest,
  LaboratoryOrder,
  RadiologyModality,
  RadiologyOrder,
  SystemAuditLog,
  Department,
  Doctor,
  DoctorConsultationFee,
  DoctorDocument,
  DoctorLeave,
  DoctorSchedule,
  DoctorTimeSlot,
  HospitalDocument,
  HospitalProfile,
  Menu,
  NumberSequence,
  Patient,
  PatientAddress,
  PatientAllergy,
  PatientConsent,
  PatientCommunication,
  PatientAuditLog,
  PatientContact,
  PatientDocument,
  PatientEmergencyContact,
  PatientIdentification,
  PatientMedicalHistory,
  PatientVisit,
  Permission,
  RegistrationSource,
  Role,
  Specialization,
  User,
} from '../database/entities/index.js';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [
    User,
    Role,
    Permission,
    Menu,
    Department,
    HospitalProfile,
    HospitalDocument,
    Specialization,
    Doctor,
    DoctorConsultationFee,
    DoctorSchedule,
    DoctorLeave,
    DoctorDocument,
    NumberSequence,
    RegistrationSource,
    Patient,
    PatientAddress,
    PatientContact,
    PatientIdentification,
    PatientEmergencyContact,
    PatientDocument,
    PatientAllergy,
    PatientConsent,
    PatientCommunication,
    PatientMedicalHistory,
    PatientVisit,
    PatientAuditLog,
    Appointment,
    AppointmentStatusHistory,
    ClinicalEncounter,
    DiagnosisTerm,
    ClinicalEncounterAddendum,
    Medication,
    Prescription,
    Ward,
    Bed,
    Admission,
    BedTransfer,
    MedicationAdministration,
    Refund,
    EmergencyCase,
    OperatingRoom,
    SurgeryCase,
    NursingCarePlan,
    InsuranceClaim,
    ChargeMaster,
    DutyShift,
    AmbulanceVehicle,
    AmbulanceTrip,
    AmbulanceDriver,
    NursingObservation,
    Invoice,
    InvoiceItem,
    Payment,
    InventoryBatch,
    StockTransaction,
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    LaboratoryTest,
    LaboratoryOrder,
    RadiologyModality,
    RadiologyOrder,
    SystemAuditLog,
    DoctorTimeSlot,
  ],
  migrations: [path.join(__dirname, '../database/migrations/*.{ts,js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  // Use local session TZ so TIMESTAMP wall times from MySQL are not treated as UTC.
  // With timezone:'Z' + SYSTEM/IST session, Booked By showed ~+5:30 (e.g. 10:04 PM → 3:34 AM).
  timezone: 'local',
});

export async function initializeDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    try {
      await AppDataSource.query('SET GLOBAL max_allowed_packet = 67108864');
    } catch {
      try {
        await AppDataSource.query('SET SESSION max_allowed_packet = 67108864');
      } catch {
        // Keep startup resilient when MySQL privileges/config block packet-size changes.
      }
    }
  }

  return AppDataSource;
}

export async function closeDataSource(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}
