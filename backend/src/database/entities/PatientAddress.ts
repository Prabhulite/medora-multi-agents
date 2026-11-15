import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './Patient.js';

@Entity({ name: 'patient_addresses' })
export class PatientAddress {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @ManyToOne(() => Patient, (patient) => patient.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'address_line1', type: 'varchar', length: 255 })
  addressLine1!: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2!: string | null;

  @Column({ type: 'varchar', length: 80 })
  country!: string;

  @Column({ type: 'varchar', length: 80 })
  state!: string;

  @Column({ type: 'varchar', length: 80 })
  district!: string;

  @Column({ type: 'varchar', length: 80 })
  city!: string;

  @Column({ type: 'varchar', length: 12 })
  pincode!: string;

  @Column({ name: 'is_primary', type: 'boolean', default: true })
  isPrimary!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
