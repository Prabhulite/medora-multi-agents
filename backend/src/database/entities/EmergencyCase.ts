import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'emergency_cases' })
export class EmergencyCase {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'case_number', type: 'varchar', length: 40, unique: true }) caseNumber!: string;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'triage_category', type: 'varchar', length: 10 }) triageCategory!: 'red' | 'yellow' | 'green';
  @Column({ name: 'chief_complaint', type: 'varchar', length: 1000 }) chiefComplaint!: string;
  @Column({ name: 'pulse_bpm', type: 'smallint', unsigned: true, nullable: true }) pulseBpm!: number | null;
  @Column({ name: 'systolic_bp', type: 'smallint', unsigned: true, nullable: true }) systolicBp!: number | null;
  @Column({ name: 'diastolic_bp', type: 'smallint', unsigned: true, nullable: true }) diastolicBp!: number | null;
  @Column({ name: 'spo2_percent', type: 'tinyint', unsigned: true, nullable: true }) spo2Percent!: number | null;
  @Column({ type: 'varchar', length: 20, default: 'waiting' }) status!: 'waiting' | 'in_care' | 'admitted' | 'discharged';
  @Column({ name: 'triaged_at', type: 'timestamp' }) triagedAt!: Date;
  @Column({ name: 'triaged_by_id', type: 'int', unsigned: true, nullable: true }) triagedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'triaged_by_id' }) triagedBy!: User | null;
  @Column({ name: 'disposition_at', type: 'timestamp', nullable: true }) dispositionAt!: Date | null;
  @Column({ name: 'disposition_note', type: 'varchar', length: 2000, nullable: true }) dispositionNote!: string | null;
  @Column({ name: 'updated_by_id', type: 'int', unsigned: true, nullable: true }) updatedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'updated_by_id' }) updatedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
