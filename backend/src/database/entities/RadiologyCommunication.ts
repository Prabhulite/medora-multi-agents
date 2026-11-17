import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RadiologyOrder } from './RadiologyOrder.js';
import { User } from './User.js';

@Entity({ name: 'radiology_communications' })
@Index('IDX_radiology_communication_delivery', ['orderId', 'outcome', 'createdAt', 'occurredAt'])
export class RadiologyCommunication {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_id', type: 'int', unsigned: true }) orderId!: number;
  @ManyToOne(() => RadiologyOrder, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'order_id' }) order!: RadiologyOrder;
  @Column({ type: 'varchar', length: 20 }) outcome!: 'attempted' | 'delivered';
  @Column({ type: 'varchar', length: 30 }) method!: 'phone' | 'in_person' | 'secure_message' | 'other';
  @Column({ name: 'recipient_name', type: 'varchar', length: 160 }) recipientName!: string;
  @Column({ name: 'finding_summary', type: 'varchar', length: 1000 }) findingSummary!: string;
  @Column({ type: 'varchar', length: 1000, nullable: true }) note!: string | null;
  @Column({ name: 'occurred_at', type: 'datetime', precision: 6 }) occurredAt!: Date;
  @Column({ name: 'recorded_by_id', type: 'int', unsigned: true, nullable: true }) recordedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'recorded_by_id' }) recordedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
