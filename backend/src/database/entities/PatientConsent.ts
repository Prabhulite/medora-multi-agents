import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'patient_consents' })
export class PatientConsent {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'consent_type', type: 'varchar', length: 40 }) consentType!: string;
  @Column({ type: 'varchar', length: 255 }) subject!: string;
  @Column({ name: 'risks_explained', type: 'text' }) risksExplained!: string;
  @Column({ name: 'treating_doctor_name', type: 'varchar', length: 160, nullable: true }) treatingDoctorName!: string | null;
  @Column({ name: 'doctor_registration_number', type: 'varchar', length: 80, nullable: true }) doctorRegistrationNumber!: string | null;
  @Column({ name: 'admission_date', type: 'date', nullable: true }) admissionDate!: string | null;
  @Column({ type: 'varchar', length: 80 }) language!: string;
  @Column({ name: 'signatory_name', type: 'varchar', length: 160 }) signatoryName!: string;
  @Column({ name: 'signatory_role', type: 'varchar', length: 40 }) signatoryRole!: 'patient' | 'guardian' | 'representative';
  @Column({ name: 'signed_at', type: 'datetime', precision: 6 }) signedAt!: Date;
  @Column({ name: 'file_name', type: 'varchar', length: 255 }) fileName!: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 80 }) mimeType!: string;
  @Column({ name: 'file_data', type: 'longtext' }) fileData!: string;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status!: 'active' | 'revoked';
  @Column({ name: 'recorded_by_id', type: 'int', unsigned: true, nullable: true }) recordedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'recorded_by_id' }) recordedBy!: User | null;
  @Column({ name: 'revoked_at', type: 'datetime', precision: 6, nullable: true }) revokedAt!: Date | null;
  @Column({ name: 'revoked_by_id', type: 'int', unsigned: true, nullable: true }) revokedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'revoked_by_id' }) revokedBy!: User | null;
  @Column({ name: 'revocation_reason', type: 'varchar', length: 1000, nullable: true }) revocationReason!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
