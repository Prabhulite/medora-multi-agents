import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Supplier } from './Supplier.js';
import { User } from './User.js';
import { PurchaseOrderItem } from './PurchaseOrderItem.js';

@Entity({ name: 'purchase_orders' })
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_number', type: 'varchar', length: 40, unique: true }) orderNumber!: string;
  @Column({ name: 'supplier_id', type: 'int', unsigned: true }) supplierId!: number;
  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'supplier_id' }) supplier!: Supplier;
  @Column({ type: 'varchar', length: 30, default: 'draft' }) status!: 'draft' | 'ordered' | 'received' | 'cancelled';
  @Column({ name: 'order_date', type: 'date' }) orderDate!: string;
  @Column({ name: 'expected_date', type: 'date', nullable: true }) expectedDate!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) total!: string;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @OneToMany(() => PurchaseOrderItem, (item) => item.order) items!: PurchaseOrderItem[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
