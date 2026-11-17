import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Admission } from './Admission.js';
import { HomeMedication } from './HomeMedication.js';

@Entity({ name: 'admission_home_medication_reviews' })
@Unique('UQ_admission_home_medication', ['admissionId', 'homeMedicationId'])
export class AdmissionHomeMedicationReview {
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
  @Column({ name: 'source_detail', type: 'varchar', length: 500, nullable: true }) sourceDetail!: string | null;
  @Column({ type: 'varchar', length: 20 }) decision!: 'continue' | 'hold' | 'stop';
  @Column({ type: 'varchar', length: 1000, nullable: true }) reason!: string | null;
  @Column({ name: 'reviewed_at', type: 'timestamp', precision: 6 }) reviewedAt!: Date;
}
