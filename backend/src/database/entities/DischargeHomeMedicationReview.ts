import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Admission } from './Admission.js';
import { HomeMedication } from './HomeMedication.js';
import { User } from './User.js';

@Entity({ name: 'discharge_home_medication_reviews' })
@Unique('UQ_discharge_home_admission_medication', ['admissionId', 'homeMedicationId'])
export class DischargeHomeMedicationReview {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_id', type: 'int', unsigned: true }) admissionId!: number;
  @ManyToOne(() => Admission, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'admission_id' }) admission!: Admission;
  @Column({ name: 'home_medication_id', type: 'int', unsigned: true }) homeMedicationId!: number;
  @ManyToOne(() => HomeMedication, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'home_medication_id' }) homeMedication!: HomeMedication;
  @Column({ name: 'medicine_name', type: 'varchar', length: 160 }) medicineName!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) dosage!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) frequency!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) route!: string | null;
  @Column({ type: 'varchar', length: 20 }) source!: HomeMedication['source'];
  @Column({ name: 'source_detail', type: 'varchar', length: 255, nullable: true }) sourceDetail!: string | null;
  @Column({ type: 'varchar', length: 20 }) decision!: 'continue' | 'stop';
  @Column({ type: 'varchar', length: 1000, nullable: true }) instructions!: string | null;
  @Column({ type: 'varchar', length: 1000, nullable: true }) reason!: string | null;
  @Column({ name: 'reviewed_by_id', type: 'int', unsigned: true, nullable: true }) reviewedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'reviewed_by_id' }) reviewedBy!: User | null;
  @Column({ name: 'reviewed_at', type: 'timestamp', precision: 6 }) reviewedAt!: Date;
}
