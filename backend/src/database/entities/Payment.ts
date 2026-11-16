import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Invoice } from './Invoice.js';
import { User } from './User.js';

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'invoice_id', type: 'int', unsigned: true }) invoiceId!: number;
  @ManyToOne(() => Invoice, (invoice) => invoice.payments, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'invoice_id' }) invoice!: Invoice;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount!: string;
  @Column({ type: 'varchar', length: 30, default: 'cash' }) method!: string;
  @Column({ name: 'reference_number', type: 'varchar', length: 120, nullable: true }) referenceNumber!: string | null;
  @Column({ name: 'paid_at', type: 'timestamp' }) paidAt!: Date;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
