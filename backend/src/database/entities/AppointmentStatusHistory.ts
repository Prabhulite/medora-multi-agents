import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Appointment, type AppointmentStatus } from './Appointment.js';
import { User } from './User.js';

@Entity({ name: 'appointment_status_history' })
export class AppointmentStatusHistory {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'appointment_id', type: 'int', unsigned: true })
  appointmentId!: number;

  @ManyToOne(() => Appointment, (appointment) => appointment.statusHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'appointment_id' })
  appointment!: Appointment;

  @Column({ name: 'from_status', type: 'varchar', length: 30, nullable: true })
  fromStatus!: AppointmentStatus | null;

  @Column({ name: 'to_status', type: 'varchar', length: 30 })
  toStatus!: AppointmentStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes!: string | null;

  @Column({ name: 'changed_by_id', type: 'int', unsigned: true, nullable: true })
  changedById!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'changed_by_id' })
  changedBy!: User | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;
}
