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
import { Doctor } from './Doctor.js';
import { Patient } from './Patient.js';
import { PatientVisit } from './PatientVisit.js';
import { User } from './User.js';
import { ClinicalEncounterAddendum } from './ClinicalEncounterAddendum.js';
import { DiagnosisTerm } from './DiagnosisTerm.js';

@Entity({ name: 'clinical_encounters' })
export class ClinicalEncounter {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'visit_id', type: 'int', unsigned: true, nullable: true }) visitId!: number | null;
  @ManyToOne(() => PatientVisit, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'visit_id' }) visit!: PatientVisit | null;
  @Column({ name: 'doctor_id', type: 'int', unsigned: true, nullable: true }) doctorId!: number | null;
  @ManyToOne(() => Doctor, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'doctor_id' }) doctor!: Doctor | null;
  @Column({ name: 'encounter_type', type: 'varchar', length: 30, default: 'consultation' }) encounterType!: string;
  @Column({ type: 'varchar', length: 30, default: 'draft' }) status!: 'draft' | 'signed' | 'amended';
  @Column({ type: 'text', nullable: true }) complaints!: string | null;
  @Column({ type: 'text', nullable: true }) examination!: string | null;
  @Column({ type: 'text', nullable: true }) assessment!: string | null;
  @Column({ type: 'text', nullable: true }) plan!: string | null;
  @Column({ name: 'diagnosis_code', type: 'varchar', length: 40, nullable: true }) diagnosisCode!: string | null;
  @Column({ name: 'diagnosis_system', type: 'varchar', length: 20, nullable: true }) diagnosisSystem!: string | null;
  @Column({ name: 'diagnosis_term_id', type: 'int', unsigned: true, nullable: true }) diagnosisTermId!: number | null;
  @ManyToOne(() => DiagnosisTerm, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'diagnosis_term_id' }) diagnosisTerm!: DiagnosisTerm | null;
  @Column({ name: 'diagnosis_version', type: 'varchar', length: 40, nullable: true }) diagnosisVersion!: string | null;
  @Column({ name: 'diagnosis_name', type: 'varchar', length: 160, nullable: true }) diagnosisName!: string | null;
  @Column({ type: 'json', nullable: true }) vitals!: Record<string, string | number | null> | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @Column({ name: 'signed_at', type: 'timestamp', nullable: true }) signedAt!: Date | null;
  @Column({ name: 'signed_by_id', type: 'int', unsigned: true, nullable: true }) signedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'signed_by_id' }) signedBy!: User | null;
  @OneToMany(() => ClinicalEncounterAddendum, (addendum) => addendum.encounter) addenda!: ClinicalEncounterAddendum[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
