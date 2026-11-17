import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { User } from './User.js';

@Entity({ name: 'cashier_closeouts' })
@Unique('uq_cashier_closeout_date', ['cashierId', 'businessDate'])
export class CashierCloseout {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'business_date', type: 'date' }) businessDate!: string;
  @Column({ name: 'cashier_id', type: 'int', unsigned: true }) cashierId!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'cashier_id' }) cashier!: User;
  @Column({ name: 'cash_received', type: 'decimal', precision: 14, scale: 2 }) cashReceived!: string;
  @Column({ name: 'cash_refunded', type: 'decimal', precision: 14, scale: 2 }) cashRefunded!: string;
  @Column({ name: 'expected_cash', type: 'decimal', precision: 14, scale: 2 }) expectedCash!: string;
  @Column({ name: 'counted_cash', type: 'decimal', precision: 14, scale: 2 }) countedCash!: string;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) variance!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) reason!: string | null;
  @CreateDateColumn({ name: 'closed_at', type: 'timestamp', precision: 6 }) closedAt!: Date;
}
