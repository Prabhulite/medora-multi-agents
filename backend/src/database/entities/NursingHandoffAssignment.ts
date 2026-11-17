import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NursingHandoff } from './NursingHandoff.js';
import { User } from './User.js';

@Entity({ name: 'nursing_handoff_assignments' })
@Index('IDX_nursing_handoff_assignments_handoff', ['handoffId', 'id'])
export class NursingHandoffAssignment {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'handoff_id', type: 'int', unsigned: true }) handoffId!: number;
  @ManyToOne(() => NursingHandoff, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'handoff_id' }) handoff!: NursingHandoff;
  @Column({ name: 'from_recipient_id', type: 'int', unsigned: true, nullable: true }) fromRecipientId!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'from_recipient_id' }) fromRecipient!: User | null;
  @Column({ name: 'to_recipient_id', type: 'int', unsigned: true, nullable: true }) toRecipientId!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'to_recipient_id' }) toRecipient!: User | null;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @Column({ name: 'changed_by_id', type: 'int', unsigned: true, nullable: true }) changedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'changed_by_id' }) changedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
