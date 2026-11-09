import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HospitalProfile } from './HospitalProfile.js';

@Entity({ name: 'hospital_documents' })
export class HospitalDocument {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'hospital_profile_id', type: 'int', unsigned: true })
  hospitalProfileId!: number;

  @ManyToOne(() => HospitalProfile, (profile) => profile.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hospital_profile_id' })
  hospitalProfile!: HospitalProfile;

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
