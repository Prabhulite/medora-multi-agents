import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SupportTicket } from './SupportTicket.js';
import { User } from './User.js';

@Entity({ name: 'support_ticket_responses' })
export class SupportTicketResponse {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'ticket_id', type: 'int', unsigned: true }) ticketId!: number;
  @ManyToOne(() => SupportTicket, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'ticket_id' }) ticket!: SupportTicket;
  @Column({ name: 'responded_by_id', type: 'int', unsigned: true }) respondedById!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'responded_by_id' }) respondedBy!: User;
  @Column({ type: 'text' }) message!: string;
  @CreateDateColumn({ name: 'responded_at', type: 'timestamp' }) respondedAt!: Date;
}
