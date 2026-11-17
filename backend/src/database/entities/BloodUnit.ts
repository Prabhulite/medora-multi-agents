import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type BloodUnitStatus = 'quarantined' | 'available' | 'issued' | 'discarded';

@Entity({ name: 'blood_units' })
export class BloodUnit {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'unit_number', type: 'varchar', length: 80, unique: true }) unitNumber!: string;
  @Column({ type: 'varchar', length: 40 }) component!: string;
  @Column({ name: 'blood_group', type: 'varchar', length: 3 }) bloodGroup!: string;
  @Column({ name: 'collected_on', type: 'date' }) collectedOn!: string;
  @Column({ name: 'expires_on', type: 'date' }) expiresOn!: string;
  @Column({ name: 'storage_location', type: 'varchar', length: 120 }) storageLocation!: string;
  @Column({ type: 'varchar', length: 20, default: 'quarantined' }) status!: BloodUnitStatus;
  @Column({ name: 'screening_reference', type: 'varchar', length: 120, nullable: true }) screeningReference!: string | null;
  @Column({ name: 'issued_patient_id', type: 'int', unsigned: true, nullable: true }) issuedPatientId!: number | null;
  @Column({ name: 'crossmatch_reference', type: 'varchar', length: 120, nullable: true }) crossmatchReference!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
