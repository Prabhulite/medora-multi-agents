import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Patient } from './Patient.js';
import { User } from './User.js';
import { InvoiceItem } from './InvoiceItem.js';
import { Payment } from './Payment.js';

@Entity({ name: 'invoices' })
export class Invoice {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'invoice_number', type: 'varchar', length: 40, unique: true }) invoiceNumber!: string;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ type: 'varchar', length: 30, default: 'open' }) status!: 'open' | 'partially_paid' | 'paid' | 'cancelled';
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) subtotal!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) discount!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) tax!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) total!: string;
  @Column({ name: 'paid_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }) paidAmount!: string;
  @Column({ name: 'balance_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }) balanceAmount!: string;
  @Column({ name: 'due_date', type: 'date', nullable: true }) dueDate!: string | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @OneToMany(() => InvoiceItem, (item) => item.invoice) items!: InvoiceItem[];
  @OneToMany(() => Payment, (payment) => payment.invoice) payments!: Payment[];
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
