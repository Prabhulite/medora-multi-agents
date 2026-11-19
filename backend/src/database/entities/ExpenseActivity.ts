import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ExpenseActivityType = 'activity' | 'expense';

@Entity({ name: 'expense_activities' })
@Index('idx_expense_activities_date', ['date'])
export class ExpenseActivity {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 120 }) title!: string;
  @Column({ type: 'varchar', length: 80 }) category!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount!: string;
  @Column({ type: 'date' }) date!: string;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes!: string | null;
  @Column({ type: 'enum', enum: ['activity', 'expense'], default: 'expense' }) type!: ExpenseActivityType;
  @Column({ name: 'created_by_user_id', type: 'int', unsigned: true, nullable: true }) createdByUserId!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 6 }) updatedAt!: Date;
}
