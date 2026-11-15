import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from './Patient.js';

@Entity({ name: 'patient_contacts' })
export class PatientContact {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'patient_id', type: 'int', unsigned: true })
  patientId!: number;

  @OneToOne(() => Patient, (patient) => patient.contact, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20 })
  mobileNumber!: string;

  @Column({ name: 'alternate_mobile', type: 'varchar', length: 20, nullable: true })
  alternateMobile!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
