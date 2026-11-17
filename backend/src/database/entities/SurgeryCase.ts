import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Doctor } from './Doctor.js';
import { OperatingRoom } from './OperatingRoom.js';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'surgery_cases' })
export class SurgeryCase {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'case_number', type: 'varchar', length: 40, unique: true }) caseNumber!: string;
  @Column({ name: 'patient_id', type: 'int', unsigned: true }) patientId!: number;
  @ManyToOne(() => Patient, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'patient_id' }) patient!: Patient;
  @Column({ name: 'surgeon_id', type: 'int', unsigned: true }) surgeonId!: number;
  @ManyToOne(() => Doctor, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'surgeon_id' }) surgeon!: Doctor;
  @Column({ name: 'room_id', type: 'int', unsigned: true }) roomId!: number;
  @ManyToOne(() => OperatingRoom, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'room_id' }) room!: OperatingRoom;
  @Column({ type: 'varchar', length: 255 }) procedure!: string;
  @Column({ name: 'planned_start', type: 'datetime' }) plannedStart!: Date;
  @Column({ name: 'planned_end', type: 'datetime' }) plannedEnd!: Date;
  @Column({ type: 'varchar', length: 20, default: 'scheduled' }) status!: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  @Column({ name: 'started_at', type: 'datetime', nullable: true }) startedAt!: Date | null;
  @Column({ name: 'completed_at', type: 'datetime', nullable: true }) completedAt!: Date | null;
  @Column({ name: 'outcome_note', type: 'text', nullable: true }) outcomeNote!: string | null;
  @Column({ name: 'cancel_reason', type: 'varchar', length: 1000, nullable: true }) cancelReason!: string | null;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @Column({ name: 'updated_by_id', type: 'int', unsigned: true, nullable: true }) updatedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'updated_by_id' }) updatedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
