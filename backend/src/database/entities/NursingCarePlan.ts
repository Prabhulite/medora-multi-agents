import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Admission } from './Admission.js';
import { User } from './User.js';

@Entity({ name: 'nursing_care_plans' })
@Index('IDX_nursing_care_plans_due', ['status', 'reviewAt', 'id'])
export class NursingCarePlan {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_id', type: 'int', unsigned: true }) admissionId!: number;
  @ManyToOne(() => Admission, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'admission_id' }) admission!: Admission;
  @Column({ type: 'varchar', length: 500 }) problem!: string;
  @Column({ type: 'varchar', length: 1000 }) goal!: string;
  @Column({ type: 'text' }) interventions!: string;
  @Column({ name: 'review_at', type: 'timestamp', nullable: true }) reviewAt!: Date | null;
  @Column({ type: 'varchar', length: 20, default: 'active' }) status!: 'active' | 'completed' | 'discontinued';
  @Column({ name: 'review_note', type: 'varchar', length: 2000, nullable: true }) reviewNote!: string | null;
  @Column({ name: 'closed_at', type: 'timestamp', nullable: true }) closedAt!: Date | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @Column({ name: 'closed_by_id', type: 'int', unsigned: true, nullable: true }) closedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'closed_by_id' }) closedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
