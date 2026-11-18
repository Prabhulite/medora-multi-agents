import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CashierCloseout } from './CashierCloseout.js';
import { CashDepositSettlement } from './CashDepositSettlement.js';
import { User } from './User.js';

@Entity({ name: 'cash_deposits' })
@Unique('uq_cash_deposit_reference', ['closeoutId', 'bankReference'])
export class CashDeposit {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'closeout_id', type: 'int', unsigned: true }) closeoutId!: number;
  @ManyToOne(() => CashierCloseout, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'closeout_id' }) closeout!: CashierCloseout;
  @Column({ name: 'deposit_date', type: 'date' }) depositDate!: string;
  @Column({ type: 'decimal', precision: 14, scale: 2 }) amount!: string;
  @Column({ name: 'bank_reference', type: 'varchar', length: 120 }) bankReference!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) note!: string | null;
  @Column({ name: 'recorded_by_id', type: 'int', unsigned: true }) recordedById!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'recorded_by_id' }) recordedBy!: User;
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamp', precision: 6 }) recordedAt!: Date;
  @Column({ name: 'voided_at', type: 'timestamp', precision: 6, nullable: true }) voidedAt!: Date | null;
  @Column({ name: 'voided_by_id', type: 'int', unsigned: true, nullable: true }) voidedById!: number | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'voided_by_id' }) voidedBy!: User | null;
  @Column({ name: 'void_reason', type: 'varchar', length: 500, nullable: true }) voidReason!: string | null;
  @OneToOne(() => CashDepositSettlement, (settlement) => settlement.deposit) settlement!: CashDepositSettlement | null;
}
