import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Bed } from './Bed.js';
import { Department } from './Department.js';
import { Doctor } from './Doctor.js';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'admissions' })
export class Admission {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_number', type: 'varchar', length: 40, unique: true }) admissionNumber!: string;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'bed_id', type: 'int', unsigned: true }) bedId!: number;
  @ManyToOne(() => Bed, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'bed_id' }) bed!: Bed;
  @Column({ name: 'doctor_id', type: 'int', unsigned: true, nullable: true }) doctorId!: number | null;
  @ManyToOne(() => Doctor, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'doctor_id' }) doctor!: Doctor | null;
  @Column({ name: 'department_id', type: 'int', unsigned: true, nullable: true }) departmentId!: number | null;
  @ManyToOne(() => Department, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'department_id' }) department!: Department | null;
  @Column({ name: 'admitted_at', type: 'timestamp' }) admittedAt!: Date;
  @Column({ name: 'discharged_at', type: 'timestamp', nullable: true }) dischargedAt!: Date | null;
  @Column({ type: 'varchar', length: 30, default: 'admitted' }) status!: 'admitted' | 'transferred' | 'discharged';
  @Column({ type: 'varchar', length: 255, nullable: true }) reason!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'discharge_summary', type: 'text', nullable: true }) dischargeSummary!: string | null;
  @Column({ name: 'discharge_diagnosis', type: 'text', nullable: true }) dischargeDiagnosis!: string | null;
  @Column({ name: 'discharge_medications', type: 'text', nullable: true }) dischargeMedications!: string | null;
  @Column({ name: 'follow_up_instructions', type: 'text', nullable: true }) followUpInstructions!: string | null;
  @Column({ name: 'discharged_by_id', type: 'int', unsigned: true, nullable: true }) dischargedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'discharged_by_id' }) dischargedBy!: User | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
