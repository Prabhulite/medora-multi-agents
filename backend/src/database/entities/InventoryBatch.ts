import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Medication } from './Medication.js';

@Entity({ name: 'inventory_batches' })
export class InventoryBatch {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'medication_id', type: 'int', unsigned: true }) medicationId!: number;
  @ManyToOne(() => Medication, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'medication_id' }) medication!: Medication;
  @Column({ name: 'batch_number', type: 'varchar', length: 80 }) batchNumber!: string;
  @Column({ name: 'expiry_date', type: 'date' }) expiryDate!: string;
  @Column({ name: 'purchase_price', type: 'decimal', precision: 12, scale: 2, default: 0 }) purchasePrice!: string;
  @Column({ name: 'selling_price', type: 'decimal', precision: 12, scale: 2, default: 0 }) sellingPrice!: string;
  @Column({ type: 'int', unsigned: true, default: 0 }) quantity!: number;
  @Column({ name: 'reorder_level', type: 'int', unsigned: true, default: 0 }) reorderLevel!: number;
  @Column({ name: 'storage_location', type: 'varchar', length: 120, nullable: true }) storageLocation!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
