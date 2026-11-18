import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { CashDeposit } from './CashDeposit.js';
import { User } from './User.js';

@Entity({ name: 'cash_deposit_settlements' })
@Unique('uq_cash_deposit_settlement_deposit', ['depositId'])
@Unique('uq_cash_deposit_settlement_reference', ['statementReference'])
export class CashDepositSettlement {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'deposit_id', type: 'int', unsigned: true }) depositId!: number;
  @OneToOne(() => CashDeposit, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'deposit_id' }) deposit!: CashDeposit;
  @Column({ name: 'statement_date', type: 'date' }) statementDate!: string;
  @Column({ name: 'statement_reference', type: 'varchar', length: 120 }) statementReference!: string;
  @Column({ name: 'matched_by_id', type: 'int', unsigned: true }) matchedById!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'matched_by_id' }) matchedBy!: User;
  @CreateDateColumn({ name: 'matched_at', type: 'timestamp', precision: 6 }) matchedAt!: Date;
}
