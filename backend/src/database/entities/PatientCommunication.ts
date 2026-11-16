import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'patient_communications' })
export class PatientCommunication {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ type: 'varchar', length: 20 }) channel!: 'phone' | 'sms' | 'email' | 'in_person' | 'other';
  @Column({ type: 'varchar', length: 20 }) direction!: 'outbound' | 'inbound';
  @Column({ type: 'varchar', length: 160 }) subject!: string;
  @Column({ type: 'text' }) summary!: string;
  @Column({ name: 'occurred_at', type: 'datetime', precision: 6 }) occurredAt!: Date;
  @Column({ name: 'follow_up_due_at', type: 'datetime', precision: 6, nullable: true }) followUpDueAt!: Date | null;
  @Column({ name: 'follow_up_completed_at', type: 'datetime', precision: 6, nullable: true }) followUpCompletedAt!: Date | null;
  @Column({ name: 'follow_up_completed_by_id', type: 'int', unsigned: true, nullable: true }) followUpCompletedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'follow_up_completed_by_id' }) followUpCompletedBy!: User | null;
  @Column({ name: 'follow_up_completion_note', type: 'varchar', length: 1000, nullable: true }) followUpCompletionNote!: string | null;
  @Column({ name: 'recorded_by_id', type: 'int', unsigned: true, nullable: true }) recordedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'recorded_by_id' }) recordedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
