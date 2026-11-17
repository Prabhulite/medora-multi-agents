import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './Doctor.js';
import { PatientAddress } from './PatientAddress.js';
import { PatientAllergy } from './PatientAllergy.js';
import { PatientAuditLog } from './PatientAuditLog.js';
import { PatientContact } from './PatientContact.js';
import { PatientDocument } from './PatientDocument.js';
import { PatientEmergencyContact } from './PatientEmergencyContact.js';
import { PatientIdentification } from './PatientIdentification.js';
import { PatientMedicalHistory } from './PatientMedicalHistory.js';
import { PatientVisit } from './PatientVisit.js';
import { RegistrationSource } from './RegistrationSource.js';
import { User } from './User.js';

export type PatientGender = 'male' | 'female' | 'transgender' | 'other';
export type PatientCategory =
  | 'general'
  | 'corporate'
  | 'insurance'
  | 'government_scheme'
  | 'staff'
  | 'vip';

@Entity({ name: 'patients' })
export class Patient {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'mrd_number', type: 'varchar', length: 40, unique: true })
  mrdNumber!: string;

  @Column({ name: 'family_id', type: 'varchar', length: 40, nullable: true })
  familyId!: string | null;

  @Column({ name: 'registration_at', type: 'timestamp' })
  registrationAt!: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  title!: string | null;

  @Column({ name: 'first_name', type: 'varchar', length: 80 })
  firstName!: string;

  @Column({ name: 'middle_name', type: 'varchar', length: 80, nullable: true })
  middleName!: string | null;

  @Column({ name: 'last_name', type: 'varchar', length: 80, nullable: true })
  lastName!: string | null;

  @Column({ type: 'varchar', length: 20 })
  gender!: PatientGender;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ name: 'age_years', type: 'int', unsigned: true, nullable: true })
  ageYears!: number | null;

  @Column({ name: 'age_is_approximate', type: 'boolean', default: false })
  ageIsApproximate!: boolean;

  @Column({ name: 'blood_group', type: 'varchar', length: 10, nullable: true })
  bloodGroup!: string | null;

  @Column({ name: 'marital_status', type: 'varchar', length: 30, nullable: true })
  maritalStatus!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nationality!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  religion!: string | null;

  @Column({ name: 'photo_data', type: 'longtext', nullable: true })
  photoData!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  occupation!: string | null;

  @Column({ name: 'patient_category', type: 'varchar', length: 40, nullable: true })
  patientCategory!: PatientCategory | null;

  @Column({ name: 'referred_by', type: 'varchar', length: 120, nullable: true })
  referredBy!: string | null;

  @Column({ name: 'referral_doctor_id', type: 'int', unsigned: true, nullable: true })
  referralDoctorId!: number | null;

  @ManyToOne(() => Doctor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'referral_doctor_id' })
  referralDoctor!: Doctor | null;

  @Column({ name: 'preferred_language', type: 'varchar', length: 60, nullable: true })
  preferredLanguage!: string | null;

  @Column({ name: 'special_remarks', type: 'text', nullable: true })
  specialRemarks!: string | null;

  @Column({ name: 'registration_source_id', type: 'int', unsigned: true, nullable: true })
  registrationSourceId!: number | null;

  @ManyToOne(() => RegistrationSource, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'registration_source_id' })
  registrationSource!: RegistrationSource | null;

  @Column({ name: 'merged_into_patient_id', type: 'int', unsigned: true, nullable: true })
  mergedIntoPatientId!: number | null;

  @ManyToOne(() => Patient, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'merged_into_patient_id' })
  mergedIntoPatient!: Patient | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true })
  createdById!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User | null;

  @Column({ name: 'updated_by_id', type: 'int', unsigned: true, nullable: true })
  updatedById!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => PatientContact, (contact) => contact.patient)
  contact!: PatientContact | null;

  @OneToMany(() => PatientAddress, (address) => address.patient)
  addresses!: PatientAddress[];

  @OneToOne(() => PatientIdentification, (identification) => identification.patient)
  identification!: PatientIdentification | null;

  @OneToOne(() => PatientEmergencyContact, (emergency) => emergency.patient)
  emergencyContact!: PatientEmergencyContact | null;

  @OneToMany(() => PatientDocument, (document) => document.patient)
  documents!: PatientDocument[];

  @OneToMany(() => PatientAllergy, (allergy) => allergy.patient)
  allergies!: PatientAllergy[];

  @OneToMany(() => PatientMedicalHistory, (history) => history.patient)
  medicalHistory!: PatientMedicalHistory[];

  @OneToMany(() => PatientVisit, (visit) => visit.patient)
  visits!: PatientVisit[];

  @OneToMany(() => PatientAuditLog, (log) => log.patient)
  auditLogs!: PatientAuditLog[];
}
