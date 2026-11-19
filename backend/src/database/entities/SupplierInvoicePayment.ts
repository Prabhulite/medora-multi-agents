import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SupplierInvoice } from './SupplierInvoice.js';

@Entity({ name: 'supplier_invoice_payments' })
export class SupplierInvoicePayment {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'supplier_invoice_id', type: 'int', unsigned: true }) supplierInvoiceId!: number;
  @ManyToOne(() => SupplierInvoice, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'supplier_invoice_id' }) invoice!: SupplierInvoice;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount!: string;
  @Column({ name: 'paid_on', type: 'date' }) paidOn!: string;
  @Column({ type: 'varchar', length: 30 }) method!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) reference!: string | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
