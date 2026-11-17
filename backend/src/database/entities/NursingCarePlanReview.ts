import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { NursingCarePlan } from './NursingCarePlan.js';
import { User } from './User.js';

@Entity({ name: 'nursing_care_plan_reviews' })
@Index('IDX_care_plan_reviews_plan', ['carePlanId', 'id'])
export class NursingCarePlanReview {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'care_plan_id', type: 'int', unsigned: true }) carePlanId!: number;
  @ManyToOne(() => NursingCarePlan, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'care_plan_id' }) carePlan!: NursingCarePlan;
  @Column({ name: 'review_note', type: 'varchar', length: 2000 }) reviewNote!: string;
  @Column({ name: 'previous_review_at', type: 'timestamp', nullable: true }) previousReviewAt!: Date | null;
  @Column({ name: 'next_review_at', type: 'timestamp' }) nextReviewAt!: Date;
  @Column({ name: 'reviewed_by_id', type: 'int', unsigned: true, nullable: true }) reviewedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'reviewed_by_id' }) reviewedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
