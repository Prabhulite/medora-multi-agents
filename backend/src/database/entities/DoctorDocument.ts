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

@Entity({ name: 'doctor_documents' })
export class DoctorDocument {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'doctor_id', type: 'int', unsigned: true })
  doctorId!: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'file_data', type: 'longtext' })
  fileData!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
