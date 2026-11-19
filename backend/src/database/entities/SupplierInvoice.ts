import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Supplier } from './Supplier.js';
import { PurchaseOrder } from './PurchaseOrder.js';

@Entity({ name: 'supplier_invoices' })
export class SupplierInvoice {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'supplier_id', type: 'int', unsigned: true }) supplierId!: number;
  @ManyToOne(() => Supplier, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'supplier_id' }) supplier!: Supplier;
  @Column({ name: 'purchase_order_id', type: 'int', unsigned: true, nullable: true }) purchaseOrderId!: number | null;
  @ManyToOne(() => PurchaseOrder, { onDelete: 'RESTRICT', nullable: true }) @JoinColumn({ name: 'purchase_order_id' }) purchaseOrder!: PurchaseOrder | null;
  @Column({ name: 'invoice_number', type: 'varchar', length: 80 }) invoiceNumber!: string;
  @Column({ name: 'invoice_date', type: 'date' }) invoiceDate!: string;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate!: string | null;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount!: string;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
