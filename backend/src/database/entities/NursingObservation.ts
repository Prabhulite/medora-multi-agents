import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Admission } from './Admission.js';
import { User } from './User.js';

@Entity({ name: 'nursing_observations' })
export class NursingObservation {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_id', type: 'int', unsigned: true }) admissionId!: number;
  @ManyToOne(() => Admission, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'admission_id' }) admission!: Admission;
  @Column({ name: 'observed_at', type: 'timestamp' }) observedAt!: Date;
  @Column({ name: 'temperature_c', type: 'decimal', precision: 4, scale: 1, nullable: true }) temperatureC!: string | null;
  @Column({ name: 'pulse_bpm', type: 'smallint', unsigned: true, nullable: true }) pulseBpm!: number | null;
  @Column({ name: 'systolic_bp', type: 'smallint', unsigned: true, nullable: true }) systolicBp!: number | null;
  @Column({ name: 'diastolic_bp', type: 'smallint', unsigned: true, nullable: true }) diastolicBp!: number | null;
  @Column({ name: 'spo2_percent', type: 'tinyint', unsigned: true, nullable: true }) spo2Percent!: number | null;
  @Column({ type: 'text', nullable: true }) notes!: string | null;
  @Column({ name: 'recorded_by_id', type: 'int', unsigned: true, nullable: true }) recordedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'recorded_by_id' }) recordedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
