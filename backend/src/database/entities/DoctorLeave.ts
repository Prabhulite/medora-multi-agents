import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './Doctor.js';

export type DoctorLeaveStatus = 'scheduled' | 'cancelled' | 'completed';

@Entity({ name: 'doctor_leave' })
export class DoctorLeave {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'doctor_id', type: 'int', unsigned: true })
  doctorId!: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.leaves, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'leave_from', type: 'date' })
  leaveFrom!: string;

  @Column({ name: 'leave_to', type: 'date' })
  leaveTo!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status!: DoctorLeaveStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
