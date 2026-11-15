import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from './Department.js';
import { Doctor } from './Doctor.js';
import { Patient } from './Patient.js';
import { User } from './User.js';

export type PatientVisitType = 'OP' | 'IP' | 'EMERGENCY';
export type PatientVisitStatus =
  | 'registered'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

@Entity({ name: 'patient_visits' })
export class PatientVisit {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @ManyToOne(() => Patient, (patient) => patient.visits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'visit_number', type: 'varchar', length: 40, unique: true })
  visitNumber!: string;

  @Column({ name: 'op_number', type: 'varchar', length: 40, unique: true, nullable: true })
  opNumber!: string | null;

  @Column({ name: 'ip_number', type: 'varchar', length: 40, nullable: true })
  ipNumber!: string | null;

  @Column({ name: 'visit_type', type: 'varchar', length: 20, default: 'OP' })
  visitType!: PatientVisitType;

  @Column({ name: 'visit_at', type: 'timestamp' })
  visitAt!: Date;

  @Column({ name: 'department_id', type: 'int', unsigned: true, nullable: true })
  departmentId!: number | null;

  @ManyToOne(() => Department, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'department_id' })
  department!: Department | null;

  @Column({ name: 'doctor_id', type: 'int', unsigned: true, nullable: true })
  doctorId!: number | null;

  @ManyToOne(() => Doctor, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor | null;

  @Column({ type: 'varchar', length: 30, default: 'registered' })
  status!: PatientVisitStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true })
  createdById!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
