import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'home_medications' })
@Index('IDX_home_medications_patient_current', ['patientId', 'isCurrent'])
export class HomeMedication {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'medicine_name', type: 'varchar', length: 160 }) medicineName!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) dosage!: string | null;
  @Column({ type: 'varchar', length: 80, nullable: true }) frequency!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) route!: string | null;
  @Column({ type: 'varchar', length: 20 }) source!: 'patient' | 'caregiver' | 'records' | 'other';
  @Column({ name: 'source_detail', type: 'varchar', length: 500, nullable: true }) sourceDetail!: string | null;
  @Column({ name: 'is_current', type: 'boolean', default: true }) isCurrent!: boolean;
  @Column({ name: 'recorded_by_id', type: 'int', unsigned: true, nullable: true }) recordedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'recorded_by_id' }) recordedBy!: User | null;
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamp', precision: 6 }) recordedAt!: Date;
  @Column({ name: 'ceased_at', type: 'timestamp', precision: 6, nullable: true }) ceasedAt!: Date | null;
  @Column({ name: 'ceased_by_id', type: 'int', unsigned: true, nullable: true }) ceasedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'ceased_by_id' }) ceasedBy!: User | null;
  @Column({ name: 'cessation_reason', type: 'varchar', length: 500, nullable: true }) cessationReason!: string | null;
}
