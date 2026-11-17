import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RadiologyOrder } from './RadiologyOrder.js';
import { User } from './User.js';

@Entity({ name: 'radiology_schedule_events' })
export class RadiologyScheduleEvent {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_id', type: 'int', unsigned: true }) orderId!: number;
  @ManyToOne(() => RadiologyOrder, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'order_id' }) order!: RadiologyOrder;
  @Column({ name: 'previous_at', type: 'datetime', precision: 6, nullable: true }) previousAt!: Date | null;
  @Column({ name: 'scheduled_at', type: 'datetime', precision: 6 }) scheduledAt!: Date;
  @Column({ name: 'previous_end_at', type: 'datetime', precision: 6, nullable: true }) previousEndAt!: Date | null;
  @Column({ name: 'scheduled_end_at', type: 'datetime', precision: 6, nullable: true }) scheduledEndAt!: Date | null;
  @Column({ name: 'previous_resource_id', type: 'int', unsigned: true, nullable: true }) previousResourceId!: number | null;
  @Column({ name: 'resource_id', type: 'int', unsigned: true, nullable: true }) resourceId!: number | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) reason!: string | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
