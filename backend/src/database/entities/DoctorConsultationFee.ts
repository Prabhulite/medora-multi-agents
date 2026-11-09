import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './Doctor.js';

@Entity({ name: 'doctor_consultation_fee' })
export class DoctorConsultationFee {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'doctor_id', type: 'int', unsigned: true, unique: true })
  doctorId!: number;

  @OneToOne(() => Doctor, (doctor) => doctor.consultationFee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({
    name: 'new_consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  newConsultationFee!: string | null;

  @Column({
    name: 'follow_up_consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  followUpConsultationFee!: string | null;

  @Column({
    name: 'emergency_consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  emergencyConsultationFee!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
