import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Invoice } from './Invoice.js';
import { User } from './User.js';

@Entity({ name: 'insurance_claims' })
export class InsuranceClaim {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'invoice_id', type: 'int', unsigned: true, unique: true }) invoiceId!: number;
  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'invoice_id' }) invoice!: Invoice;
  @Column({ name: 'claim_number', type: 'varchar', length: 40, unique: true }) claimNumber!: string;
  @Column({ name: 'payer_name', type: 'varchar', length: 160 }) payerName!: string;
  @Column({ name: 'policy_number', type: 'varchar', length: 120 }) policyNumber!: string;
  @Column({ name: 'claimed_amount', type: 'decimal', precision: 12, scale: 2 }) claimedAmount!: string;
  @Column({ name: 'approved_amount', type: 'decimal', precision: 12, scale: 2, nullable: true }) approvedAmount!: string | null;
  @Column({ type: 'varchar', length: 20, default: 'draft' }) status!: 'draft' | 'submitted' | 'approved' | 'rejected' | 'settled';
  @Column({ type: 'varchar', length: 2000, nullable: true }) notes!: string | null;
  @Column({ name: 'decision_note', type: 'varchar', length: 2000, nullable: true }) decisionNote!: string | null;
  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true }) submittedAt!: Date | null;
  @Column({ name: 'decided_at', type: 'timestamp', nullable: true }) decidedAt!: Date | null;
  @Column({ name: 'settled_at', type: 'timestamp', nullable: true }) settledAt!: Date | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @Column({ name: 'updated_by_id', type: 'int', unsigned: true, nullable: true }) updatedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'updated_by_id' }) updatedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
