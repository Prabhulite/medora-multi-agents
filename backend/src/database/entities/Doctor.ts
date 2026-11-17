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
import { Department } from './Department.js';
import { DoctorConsultationFee } from './DoctorConsultationFee.js';
import { DoctorDocument } from './DoctorDocument.js';
import { DoctorLeave } from './DoctorLeave.js';
import { DoctorSchedule } from './DoctorSchedule.js';
import { Specialization } from './Specialization.js';
import { User } from './User.js';

export type DoctorGender = 'male' | 'female' | 'other';
export type DoctorDesignation =
  | 'consultant'
  | 'senior_consultant'
  | 'visiting_consultant';
export type DoctorType = 'in_house' | 'visiting';

@Entity({ name: 'doctor_master' })
export class Doctor {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'doctor_code', type: 'varchar', length: 20, unique: true })
  doctorCode!: string;

  @Column({ name: 'account_user_id', type: 'int', unsigned: true, unique: true, nullable: true })
  accountUserId!: number | null;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'account_user_id' })
  accountUser!: User | null;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender!: DoctorGender | null;

  @Column({ type: 'date', nullable: true })
  dob!: string | null;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20 })
  mobileNumber!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'photo_data', type: 'longtext', nullable: true })
  photoData!: string | null;

  @Column({ type: 'varchar', length: 160 })
  qualification!: string;

  @Column({ name: 'specialization_id', type: 'int', unsigned: true })
  specializationId!: number;

  @ManyToOne(() => Specialization, (specialization) => specialization.doctors, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'specialization_id' })
  specialization!: Specialization;

  @Column({ name: 'department_id', type: 'int', unsigned: true })
  departmentId!: number;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  @Column({ name: 'medical_registration_number', type: 'varchar', length: 80 })
  medicalRegistrationNumber!: string;

  @Column({ name: 'experience_years', type: 'int', unsigned: true, nullable: true })
  experienceYears!: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  designation!: DoctorDesignation | null;

  @Column({ name: 'review_validity_days', type: 'int', unsigned: true, nullable: true })
  reviewValidityDays!: number | null;

  @Column({
    name: 'consultation_duration_minutes',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  consultationDurationMinutes!: number | null;

  @Column({ name: 'walk_in_allowed', type: 'boolean', default: true })
  walkInAllowed!: boolean;

  @Column({ name: 'appointment_required', type: 'boolean', default: false })
  appointmentRequired!: boolean;

  @Column({ name: 'consultation_room', type: 'varchar', length: 80, nullable: true })
  consultationRoom!: string | null;

  @Column({ name: 'doctor_type', type: 'varchar', length: 20, nullable: true })
  doctorType!: DoctorType | null;

  @Column({ name: 'joining_date', type: 'date', nullable: true })
  joiningDate!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToOne(() => DoctorConsultationFee, (fee) => fee.doctor)
  consultationFee!: DoctorConsultationFee | null;

  @OneToMany(() => DoctorSchedule, (schedule) => schedule.doctor)
  schedules!: DoctorSchedule[];

  @OneToMany(() => DoctorLeave, (leave) => leave.doctor)
  leaves!: DoctorLeave[];

  @OneToMany(() => DoctorDocument, (document) => document.doctor)
  documents!: DoctorDocument[];
}
