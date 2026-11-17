import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'user_notifications' })
export class UserNotification {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'recipient_id', type: 'int', unsigned: true }) recipientId!: number;
  @Column({ type: 'varchar', length: 40 }) kind!: string;
  @Column({ name: 'source_id', type: 'int', unsigned: true }) sourceId!: number;
  @Column({ type: 'varchar', length: 160 }) title!: string;
  @Column({ type: 'varchar', length: 500 }) message!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) route!: string | null;
  @Column({ name: 'read_at', type: 'timestamp', nullable: true }) readAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
