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

@Entity({ name: 'patient_allergies' })
export class PatientAllergy {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @ManyToOne(() => Patient, (patient) => patient.allergies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ type: 'varchar', length: 160 })
  allergen!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reaction!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  severity!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
