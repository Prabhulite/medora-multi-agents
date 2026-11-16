import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Admission } from './Admission.js';
import { Prescription } from './Prescription.js';
import { User } from './User.js';

@Entity({ name: 'medication_administrations' })
export class MedicationAdministration {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_id', type: 'int', unsigned: true }) admissionId!: number;
  @ManyToOne(() => Admission, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'admission_id' }) admission!: Admission;
  @Column({ name: 'prescription_id', type: 'int', unsigned: true }) prescriptionId!: number;
  @ManyToOne(() => Prescription, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'prescription_id' }) prescription!: Prescription;
  @Column({ type: 'varchar', length: 20 }) outcome!: 'given' | 'withheld' | 'refused';
  @Column({ name: 'dose_given', type: 'varchar', length: 80, nullable: true }) doseGiven!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) route!: string | null;
  @Column({ type: 'varchar', length: 1000, nullable: true }) notes!: string | null;
  @Column({ name: 'administered_by_id', type: 'int', unsigned: true, nullable: true }) administeredById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'administered_by_id' }) administeredBy!: User | null;
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamp', precision: 6 }) recordedAt!: Date;
}
