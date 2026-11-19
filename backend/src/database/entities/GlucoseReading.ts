import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Patient } from './Patient.js';
import { User } from './User.js';

export type GlucoseContext = 'fasting' | 'random' | 'post_meal';

@Entity({ name: 'glucose_readings' })
@Index('idx_glucose_patient_measured', ['patientId', 'measuredAt'])
export class GlucoseReading {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'value_mg_dl', type: 'decimal', precision: 6, scale: 1 }) valueMgDl!: number;
  @Column({ type: 'varchar', length: 20 }) context!: GlucoseContext;
  @Column({ name: 'measured_at', type: 'datetime', precision: 3 }) measuredAt!: Date;
  @Column({ type: 'varchar', length: 1000, nullable: true }) notes!: string | null;
  @Column({ name: 'recorded_by_user_id', type: 'int', unsigned: true }) recordedByUserId!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'recorded_by_user_id' }) recordedBy!: User;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 }) createdAt!: Date;
}
