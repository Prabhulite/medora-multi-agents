import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './Doctor.js';

@Entity({ name: 'doctor_schedule' })
@Unique('UQ_doctor_schedule_doctor_day', ['doctorId', 'dayOfWeek'])
export class DoctorSchedule {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'doctor_id', type: 'int', unsigned: true })
  doctorId!: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  /** 0 = Sunday … 6 = Saturday */
  @Column({ name: 'day_of_week', type: 'tinyint', unsigned: true })
  dayOfWeek!: number;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  @Column({ name: 'morning_start', type: 'time', nullable: true })
  morningStart!: string | null;

  @Column({ name: 'morning_end', type: 'time', nullable: true })
  morningEnd!: string | null;

  @Column({ name: 'evening_start', type: 'time', nullable: true })
  eveningStart!: string | null;

  @Column({ name: 'evening_end', type: 'time', nullable: true })
  eveningEnd!: string | null;

  @Column({ name: 'break_start', type: 'time', nullable: true })
  breakStart!: string | null;

  @Column({ name: 'break_end', type: 'time', nullable: true })
  breakEnd!: string | null;

  @Column({ name: 'max_patients_per_session', type: 'int', unsigned: true, nullable: true })
  maxPatientsPerSession!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
