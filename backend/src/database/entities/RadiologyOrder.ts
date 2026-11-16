import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Doctor } from './Doctor.js';
import { Patient } from './Patient.js';
import { RadiologyModality } from './RadiologyModality.js';
import { User } from './User.js';

@Entity({ name: 'radiology_orders' })
export class RadiologyOrder {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_number', type: 'varchar', length: 40, unique: true }) orderNumber!: string;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'modality_id', type: 'int', unsigned: true }) modalityId!: number;
  @ManyToOne(() => RadiologyModality, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'modality_id' }) modality!: RadiologyModality;
  @Column({ name: 'doctor_id', type: 'int', unsigned: true, nullable: true }) doctorId!: number | null;
  @ManyToOne(() => Doctor, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'doctor_id' }) doctor!: Doctor | null;
  @Column({ type: 'varchar', length: 30, default: 'ordered' }) status!: 'ordered' | 'scheduled' | 'performed' | 'reported' | 'cancelled';
  @Column({ type: 'varchar', length: 30, default: 'routine' }) priority!: 'routine' | 'urgent' | 'stat';
  @Column({ name: 'clinical_notes', type: 'text', nullable: true }) clinicalNotes!: string | null;
  @Column({ name: 'ordered_at', type: 'timestamp' }) orderedAt!: Date;
  @Column({ name: 'performed_at', type: 'timestamp', nullable: true }) performedAt!: Date | null;
  @Column({ name: 'reported_at', type: 'timestamp', nullable: true }) reportedAt!: Date | null;
  @Column({ name: 'report_text', type: 'text', nullable: true }) reportText!: string | null;
  @Column({ name: 'impression', type: 'text', nullable: true }) impression!: string | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @Column({ name: 'reported_by_id', type: 'int', unsigned: true, nullable: true }) reportedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'reported_by_id' }) reportedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
