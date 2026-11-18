import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Admission } from './Admission.js';
import { User } from './User.js';

@Entity({ name: 'nursing_handoffs' })
@Index('IDX_nursing_handoffs_admission', ['admissionId', 'id'])
@Index('IDX_nursing_handoffs_pending', ['acknowledgedAt', 'id'])
@Index('IDX_nursing_handoffs_recipient_pending', ['recipientId', 'acknowledgedAt'])
@Index('IDX_nursing_handoffs_ack_due', ['acknowledgementDueAt', 'acknowledgedAt', 'closedOnDischargeAt'])
export class NursingHandoff {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_id', type: 'int', unsigned: true }) admissionId!: number;
  @ManyToOne(() => Admission, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'admission_id' }) admission!: Admission;
  @Column({ name: 'condition_summary', type: 'text' }) conditionSummary!: string;
  @Column({ name: 'pending_tasks', type: 'text' }) pendingTasks!: string;
  @Column({ name: 'safety_concerns', type: 'text', nullable: true }) safetyConcerns!: string | null;
  @Column({ name: 'outgoing_by_id', type: 'int', unsigned: true }) outgoingById!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'outgoing_by_id' }) outgoingBy!: User;
  @Column({ name: 'recipient_id', type: 'int', unsigned: true, nullable: true }) recipientId!: number | null;
  @Column({ name: 'acknowledgement_due_at', type: 'timestamp', nullable: true }) acknowledgementDueAt!: Date | null;
  @Column({ name: 'overdue_reminded_at', type: 'timestamp', precision: 6, nullable: true }) overdueRemindedAt!: Date | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'recipient_id' }) recipient!: User | null;
  @Column({ name: 'acknowledged_by_id', type: 'int', unsigned: true, nullable: true }) acknowledgedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'acknowledged_by_id' }) acknowledgedBy!: User | null;
  @Column({ name: 'acknowledged_at', type: 'timestamp', nullable: true }) acknowledgedAt!: Date | null;
  @Column({ name: 'closed_on_discharge_at', type: 'timestamp', nullable: true }) closedOnDischargeAt!: Date | null;
  @Column({ name: 'closed_on_discharge_by_id', type: 'int', unsigned: true, nullable: true }) closedOnDischargeById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'closed_on_discharge_by_id' }) closedOnDischargeBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
