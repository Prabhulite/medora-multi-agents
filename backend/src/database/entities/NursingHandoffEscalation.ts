import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NursingHandoff } from './NursingHandoff.js';
import { User } from './User.js';

@Entity({ name: 'nursing_handoff_escalations' })
@Index('IDX_nursing_handoff_escalations_handoff', ['handoffId', 'id'])
@Index('UQ_nursing_handoff_escalation_target', ['handoffId', 'recipientId'], { unique: true })
export class NursingHandoffEscalation {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'handoff_id', type: 'int', unsigned: true }) handoffId!: number;
  @ManyToOne(() => NursingHandoff, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'handoff_id' }) handoff!: NursingHandoff;
  @Column({ name: 'recipient_id', type: 'int', unsigned: true, nullable: true }) recipientId!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'recipient_id' }) recipient!: User | null;
  @Column({ name: 'raised_by_id', type: 'int', unsigned: true, nullable: true }) raisedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'raised_by_id' }) raisedBy!: User | null;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
