import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ClinicalEncounter } from './ClinicalEncounter.js';
import { Medication } from './Medication.js';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'prescriptions' })
export class Prescription {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'encounter_id', type: 'int', unsigned: true, nullable: true }) encounterId!: number | null;
  @ManyToOne(() => ClinicalEncounter, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'encounter_id' }) encounter!: ClinicalEncounter | null;
  @Column({ name: 'medication_id', type: 'int', unsigned: true, nullable: true }) medicationId!: number | null;
  @ManyToOne(() => Medication, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'medication_id' }) medication!: Medication | null;
  @Column({ name: 'medicine_name', type: 'varchar', length: 160 }) medicineName!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) dosage!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) frequency!: string | null;
  @Column({ name: 'duration_days', type: 'int', unsigned: true, nullable: true }) durationDays!: number | null;
  @Column({ name: 'quantity_prescribed', type: 'int', unsigned: true, nullable: true }) quantityPrescribed!: number | null;
  @Column({ type: 'varchar', length: 40, default: 'oral' }) route!: string;
  @Column({ type: 'text', nullable: true }) instructions!: string | null;
  @Column({ type: 'varchar', length: 30, default: 'active' }) status!: 'active' | 'stopped' | 'completed';
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
