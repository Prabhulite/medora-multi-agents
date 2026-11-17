import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RadiologyOrder } from './RadiologyOrder.js';
import { User } from './User.js';

@Entity({ name: 'radiology_report_addenda' })
export class RadiologyReportAddendum {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_id', type: 'int', unsigned: true }) orderId!: number;
  @ManyToOne(() => RadiologyOrder, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'order_id' }) order!: RadiologyOrder;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @Column({ type: 'text' }) addendum!: string;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
