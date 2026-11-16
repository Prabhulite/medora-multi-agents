import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Invoice } from './Invoice.js';
import { Payment } from './Payment.js';
import { User } from './User.js';

@Entity({ name: 'refunds' })
export class Refund {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'invoice_id', type: 'int', unsigned: true }) invoiceId!: number;
  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'invoice_id' }) invoice!: Invoice;
  @Column({ name: 'payment_id', type: 'int', unsigned: true }) paymentId!: number;
  @ManyToOne(() => Payment, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'payment_id' }) payment!: Payment;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount!: string;
  @Column({ type: 'varchar', length: 30 }) method!: string;
  @Column({ name: 'reference_number', type: 'varchar', length: 120, nullable: true }) referenceNumber!: string | null;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'refunded_at', type: 'timestamp', precision: 6 }) refundedAt!: Date;
}
