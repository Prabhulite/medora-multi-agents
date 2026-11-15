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
import { Appointment } from './Appointment.js';
import { Doctor } from './Doctor.js';

@Entity({ name: 'doctor_time_slots' })
@Unique('UQ_doctor_time_slots_doctor_date_time', ['doctorId', 'slotDate', 'slotTime'])
export class DoctorTimeSlot {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'doctor_id', type: 'int', unsigned: true })
  doctorId!: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'slot_date', type: 'date' })
  slotDate!: string;

  @Column({ name: 'slot_time', type: 'time' })
  slotTime!: string;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  @Column({ name: 'appointment_id', type: 'int', unsigned: true, nullable: true })
  appointmentId!: number | null;

  @ManyToOne(() => Appointment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
