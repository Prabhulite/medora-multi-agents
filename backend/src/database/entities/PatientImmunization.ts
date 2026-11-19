import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'patient_immunizations' })
@Index('idx_immunization_patient_date', ['patientId', 'administeredOn'])
@Index('uq_immunization_dose', ['patientId', 'vaccineId', 'doseNumber'], { unique: true })
export class PatientImmunization {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @Column({ name: 'vaccine_id', type: 'int', unsigned: true }) vaccineId!: number;
  @Column({ name: 'dose_number', type: 'int', unsigned: true }) doseNumber!: number;
  @Column({ name: 'administered_on', type: 'date' }) administeredOn!: string;
  @Column({ name: 'next_due_on', type: 'date', nullable: true }) nextDueOn!: string | null;
  @Column({ type: 'varchar', length: 120, nullable: true }) lotNumber!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) remarks!: string | null;
  @Column({ name: 'recorded_by_user_id', type: 'int', unsigned: true, nullable: true }) recordedByUserId!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
