import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from './Department.js';
import { AppointmentStatusHistory } from './AppointmentStatusHistory.js';
import { Doctor } from './Doctor.js';
import { Patient } from './Patient.js';
import { PatientVisit } from './PatientVisit.js';
import { User } from './User.js';

export type AppointmentType = 'new_consultation' | 'follow_up' | 'review';
export type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'appointment_number', type: 'varchar', length: 40, unique: true })
  appointmentNumber!: string;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'doctor_id', type: 'int', unsigned: true })
  doctorId!: number;

  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'department_id', type: 'int', unsigned: true })
  departmentId!: number;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate!: string;

  @Column({ name: 'appointment_time', type: 'time' })
  appointmentTime!: string;

  @Column({ name: 'appointment_type', type: 'varchar', length: 40 })
  appointmentType!: AppointmentType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'booked' })
  status!: AppointmentStatus;

  @Column({ name: 'visit_id', type: 'int', unsigned: true, nullable: true })
  visitId!: number | null;

  @ManyToOne(() => PatientVisit, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'visit_id' })
  visit!: PatientVisit | null;

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

  @OneToMany(() => AppointmentStatusHistory, (history) => history.appointment)
  statusHistory!: AppointmentStatusHistory[];
}
