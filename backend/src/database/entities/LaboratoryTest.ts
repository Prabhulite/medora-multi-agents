import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'laboratory_tests' })
export class LaboratoryTest {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'test_code', type: 'varchar', length: 40, unique: true }) testCode!: string;
  @Column({ name: 'test_name', type: 'varchar', length: 180 }) testName!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) category!: string | null;
  @Column({ type: 'varchar', length: 40, default: 'routine' }) priority!: 'routine' | 'urgent' | 'stat';
  @Column({ name: 'turnaround_hours', type: 'int', unsigned: true, default: 24 }) turnaroundHours!: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) price!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
