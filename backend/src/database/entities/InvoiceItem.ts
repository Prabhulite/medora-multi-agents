import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Invoice } from './Invoice.js';
import { ChargeMaster } from './ChargeMaster.js';

@Entity({ name: 'invoice_items' })
export class InvoiceItem {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'invoice_id', type: 'int', unsigned: true }) invoiceId!: number;
  @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'invoice_id' }) invoice!: Invoice;
  @Column({ name: 'charge_id', type: 'int', unsigned: true, nullable: true }) chargeId!: number | null;
  @ManyToOne(() => ChargeMaster, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'charge_id' }) charge!: ChargeMaster | null;
  @Column({ type: 'varchar', length: 255 }) description!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 1 }) quantity!: string;
  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 }) unitPrice!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) total!: string;
}
