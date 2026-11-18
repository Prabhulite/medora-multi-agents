import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { InventoryBatch } from './InventoryBatch.js';
import { Patient } from './Patient.js';
import { Prescription } from './Prescription.js';
import { User } from './User.js';

@Entity({ name: 'stock_transactions' })
export class StockTransaction {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'batch_id', type: 'int', unsigned: true }) batchId!: number;
  @ManyToOne(() => InventoryBatch, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'batch_id' }) batch!: InventoryBatch;
  @Column({ type: 'varchar', length: 30 }) type!: 'receipt' | 'dispense' | 'adjustment' | 'quarantine' | 'release' | 'disposal';
  @Column({ type: 'int' }) quantity!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true, nullable: true }) patientId!: number | null;
  @ManyToOne(() => Patient, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'patient_id' }) patient!: Patient | null;
  @Column({ name: 'prescription_id', type: 'int', unsigned: true, nullable: true }) prescriptionId!: number | null;
  @ManyToOne(() => Prescription, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'prescription_id' }) prescription!: Prescription | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) reference!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'fefo_override_reason', type: 'varchar', length: 500, nullable: true }) fefoOverrideReason!: string | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
