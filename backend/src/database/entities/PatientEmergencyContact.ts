import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './Patient.js';

export type EmergencyRelationship =
  | 'father'
  | 'mother'
  | 'husband'
  | 'wife'
  | 'son'
  | 'daughter'
  | 'brother'
  | 'sister'
  | 'guardian'
  | 'other';

@Entity({ name: 'patient_emergency_contacts' })
export class PatientEmergencyContact {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @OneToOne(() => Patient, (patient) => patient.emergencyContact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'contact_person_name', type: 'varchar', length: 120, nullable: true })
  contactPersonName!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  relationship!: EmergencyRelationship | null;

  @Column({ name: 'contact_number', type: 'varchar', length: 20, nullable: true })
  contactNumber!: string | null;

  @Column({ name: 'alternate_number', type: 'varchar', length: 20, nullable: true })
  alternateNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
