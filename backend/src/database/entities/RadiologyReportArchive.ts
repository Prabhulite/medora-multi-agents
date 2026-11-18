import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RadiologyOrder } from './RadiologyOrder.js';
import { User } from './User.js';

@Entity({ name: 'radiology_report_archives' })
@Index('UQ_radiology_report_archives_order', ['orderId'], { unique: true })
export class RadiologyReportArchive {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_id', type: 'int', unsigned: true }) orderId!: number;
  @ManyToOne(() => RadiologyOrder, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'order_id' }) order!: RadiologyOrder;
  @Column({ name: 'snapshot_json', type: 'json' }) snapshot!: Record<string, unknown>;
  @Column({ type: 'char', length: 64 }) checksum!: string;
  @Column({ name: 'reported_at', type: 'timestamp', precision: 6 }) reportedAt!: Date;
  @Column({ name: 'archived_by_id', type: 'int', unsigned: true, nullable: true }) archivedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true }) @JoinColumn({ name: 'archived_by_id' }) archivedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
