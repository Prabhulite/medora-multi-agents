import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'patient_audit_logs' })
export class PatientAuditLog {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @ManyToOne(() => Patient, (patient) => patient.auditLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ type: 'varchar', length: 40 })
  action!: string;

  @Column({ name: 'changed_by_id', type: 'int', unsigned: true, nullable: true })
  changedById!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy!: User | null;

  @Column({ name: 'change_summary', type: 'varchar', length: 255, nullable: true })
  changeSummary!: string | null;

  @Column({ name: 'before_data', type: 'longtext', nullable: true })
  beforeData!: string | null;

  @Column({ name: 'after_data', type: 'longtext', nullable: true })
  afterData!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
