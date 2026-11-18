import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LaboratoryOrder } from './LaboratoryOrder.js';
import { User } from './User.js';

@Entity({ name: 'laboratory_report_archives' })
@Index('UQ_laboratory_report_archives_order', ['orderId'], { unique: true })
export class LaboratoryReportArchive {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'order_id', type: 'int', unsigned: true }) orderId!: number;
  @ManyToOne(() => LaboratoryOrder, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'order_id' }) order!: LaboratoryOrder;
  @Column({ name: 'snapshot_json', type: 'json' }) snapshot!: Record<string, unknown>;
  @Column({ type: 'char', length: 64 }) checksum!: string;
  @Column({ name: 'released_at', type: 'timestamp', precision: 6 }) releasedAt!: Date;
  @Column({ name: 'archived_by_id', type: 'int', unsigned: true, nullable: true }) archivedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: true }) @JoinColumn({ name: 'archived_by_id' }) archivedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
