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

export type IdProofType = 'aadhaar' | 'passport' | 'voter_id' | 'driving_licence' | 'other';

@Entity({ name: 'patient_identifications' })
export class PatientIdentification {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @OneToOne(() => Patient, (patient) => patient.identification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'id_proof_type', type: 'varchar', length: 40, nullable: true })
  idProofType!: IdProofType | null;

  @Column({ name: 'id_proof_number', type: 'varchar', length: 80, nullable: true })
  idProofNumber!: string | null;

  @Column({ name: 'id_proof_document_name', type: 'varchar', length: 160, nullable: true })
  idProofDocumentName!: string | null;

  @Column({ name: 'id_proof_document_file_name', type: 'varchar', length: 255, nullable: true })
  idProofDocumentFileName!: string | null;

  @Column({ name: 'id_proof_document_mime_type', type: 'varchar', length: 120, nullable: true })
  idProofDocumentMimeType!: string | null;

  @Column({ name: 'id_proof_document_data', type: 'longtext', nullable: true })
  idProofDocumentData!: string | null;

  @Column({ name: 'abha_number', type: 'varchar', length: 40, nullable: true })
  abhaNumber!: string | null;

  @Column({ name: 'abha_address', type: 'varchar', length: 120, nullable: true })
  abhaAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
