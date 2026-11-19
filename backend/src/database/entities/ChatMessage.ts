import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'staff_chat_messages' })
export class ChatMessage {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'sender_id', type: 'int', unsigned: true }) senderId!: number;
  @Column({ name: 'recipient_id', type: 'int', unsigned: true }) recipientId!: number;
  @Column({ type: 'text' }) body!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
