import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Admission } from './Admission.js';
import { Prescription } from './Prescription.js';
import { User } from './User.js';

@Entity({ name: 'discharge_medication_reviews' })
@Unique('UQ_discharge_medication_admission_prescription', ['admissionId', 'prescriptionId'])
export class DischargeMedicationReview {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_id', type: 'int', unsigned: true }) admissionId!: number;
  @ManyToOne(() => Admission, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'admission_id' }) admission!: Admission;
  @Column({ name: 'prescription_id', type: 'int', unsigned: true }) prescriptionId!: number;
  @ManyToOne(() => Prescription, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'prescription_id' }) prescription!: Prescription;
  @Column({ name: 'medicine_name', type: 'varchar', length: 160 }) medicineName!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) dosage!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) frequency!: string | null;
  @Column({ type: 'varchar', length: 40 }) route!: string;
  @Column({ type: 'varchar', length: 20 }) decision!: 'continue' | 'stop';
  @Column({ type: 'varchar', length: 1000, nullable: true }) instructions!: string | null;
  @Column({ type: 'varchar', length: 1000, nullable: true }) reason!: string | null;
  @Column({ name: 'reviewed_by_id', type: 'int', unsigned: true, nullable: true }) reviewedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'reviewed_by_id' }) reviewedBy!: User | null;
  @Column({ name: 'reviewed_at', type: 'timestamp', precision: 6 }) reviewedAt!: Date;
}
