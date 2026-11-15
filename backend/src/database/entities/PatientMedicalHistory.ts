import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './Patient.js';

@Entity({ name: 'patient_medical_history' })
export class PatientMedicalHistory {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @ManyToOne(() => Patient, (patient) => patient.medicalHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'condition_name', type: 'varchar', length: 160 })
  conditionName!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'diagnosed_on', type: 'date', nullable: true })
  diagnosedOn!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
