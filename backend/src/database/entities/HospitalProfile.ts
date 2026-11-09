import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HospitalDocument } from './HospitalDocument.js';

export type HospitalType = 'multi_speciality' | 'ivf' | 'general' | 'clinic';

@Entity({ name: 'hospital_profiles' })
export class HospitalProfile {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'hospital_name', type: 'varchar', length: 160 })
  hospitalName!: string;

  @Column({ name: 'hospital_code', type: 'varchar', length: 40, unique: true })
  hospitalCode!: string;

  @Column({ name: 'hospital_type', type: 'varchar', length: 40, nullable: true })
  hospitalType!: HospitalType | null;

  @Column({ name: 'registration_number', type: 'varchar', length: 80, nullable: true })
  registrationNumber!: string | null;

  @Column({ name: 'gst_number', type: 'varchar', length: 40, nullable: true })
  gstNumber!: string | null;

  @Column({ name: 'contact_number', type: 'varchar', length: 30, nullable: true })
  contactNumber!: string | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  email!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  district!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  pincode!: string | null;

  @Column({ name: 'logo_data', type: 'longtext', nullable: true })
  logoData!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website!: string | null;

  @Column({ name: 'time_zone', type: 'varchar', length: 80, nullable: true })
  timeZone!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'INR' })
  currency!: string | null;

  @Column({ name: 'date_format', type: 'varchar', length: 40, nullable: true })
  dateFormat!: string | null;

  @Column({ name: 'financial_year', type: 'varchar', length: 40, nullable: true })
  financialYear!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => HospitalDocument, (document) => document.hospitalProfile)
  documents!: HospitalDocument[];
}
