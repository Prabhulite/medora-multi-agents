import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { LaboratoryTest } from './LaboratoryTest.js';
import { User } from './User.js';

@Entity({ name: 'laboratory_test_revisions' })
@Index('IDX_laboratory_test_revisions_test_created', ['testId', 'createdAt', 'id'])
export class LaboratoryTestRevision {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'test_id', type: 'int', unsigned: true }) testId!: number;
  @ManyToOne(() => LaboratoryTest, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'test_id' }) test!: LaboratoryTest;
  @Column({ name: 'before_data', type: 'json' }) beforeData!: Record<string, unknown>;
  @Column({ name: 'after_data', type: 'json' }) afterData!: Record<string, unknown>;
  @Column({ name: 'changed_by_id', type: 'int', unsigned: true }) changedById!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'changed_by_id' }) changedBy!: User;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
