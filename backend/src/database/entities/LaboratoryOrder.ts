import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Doctor } from './Doctor.js';
import { LaboratoryTest } from './LaboratoryTest.js';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'laboratory_orders' })
export class LaboratoryOrder {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_number', type: 'varchar', length: 40, unique: true }) orderNumber!: string;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'test_id', type: 'int', unsigned: true }) testId!: number;
  @ManyToOne(() => LaboratoryTest, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'test_id' }) test!: LaboratoryTest;
  @Column({ name: 'doctor_id', type: 'int', unsigned: true, nullable: true }) doctorId!: number | null;
  @ManyToOne(() => Doctor, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'doctor_id' }) doctor!: Doctor | null;
  @Column({ type: 'varchar', length: 30, default: 'ordered' }) status!: 'ordered' | 'collected' | 'processing' | 'verified' | 'completed' | 'cancelled';
  @Column({ type: 'varchar', length: 10, default: 'routine' }) priority!: 'routine' | 'urgent' | 'stat';
  @Column({ name: 'clinical_notes', type: 'text', nullable: true }) clinicalNotes!: string | null;
  @Column({ name: 'ordered_at', type: 'timestamp' }) orderedAt!: Date;
  @Column({ name: 'collected_at', type: 'timestamp', nullable: true }) collectedAt!: Date | null;
  @Column({ name: 'specimen_label', type: 'varchar', length: 80, nullable: true }) specimenLabel!: string | null;
  @Column({ name: 'collected_by_id', type: 'int', unsigned: true, nullable: true }) collectedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'collected_by_id' }) collectedBy!: User | null;
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true }) completedAt!: Date | null;
  @Column({ name: 'verified_at', type: 'timestamp', precision: 6, nullable: true }) verifiedAt!: Date | null;
  @Column({ name: 'verified_by_id', type: 'int', unsigned: true, nullable: true }) verifiedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'verified_by_id' }) verifiedBy!: User | null;
  @Column({ name: 'released_by_id', type: 'int', unsigned: true, nullable: true }) releasedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'released_by_id' }) releasedBy!: User | null;
  @Column({ name: 'result_value', type: 'text', nullable: true }) resultValue!: string | null;
  @Column({ name: 'result_unit', type: 'varchar', length: 60, nullable: true }) resultUnit!: string | null;
  @Column({ name: 'reference_range', type: 'varchar', length: 120, nullable: true }) referenceRange!: string | null;
  @Column({ name: 'result_notes', type: 'text', nullable: true }) resultNotes!: string | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @Column({ name: 'resulted_by_id', type: 'int', unsigned: true, nullable: true }) resultedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'resulted_by_id' }) resultedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
