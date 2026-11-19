import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User.js';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

@Entity({ name: 'support_tickets' })
export class SupportTicket {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true }) createdById!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User;
  @Column({ name: 'issue_title', type: 'varchar', length: 180 }) issueTitle!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ type: 'varchar', length: 20, default: 'Open' }) status!: TicketStatus;
  @Column({ type: 'varchar', length: 20, default: 'Medium' }) priority!: TicketPriority;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
