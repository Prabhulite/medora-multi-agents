import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User.js';

@Entity({ name: 'duty_shifts' })
export class DutyShift {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'staff_id', type: 'int', unsigned: true }) staffId!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'staff_id' }) staff!: User;
  @Column({ name: 'starts_at', type: 'timestamp' }) startsAt!: Date;
  @Column({ name: 'ends_at', type: 'timestamp' }) endsAt!: Date;
  @Column({ type: 'varchar', length: 120 }) location!: string;
  @Column({ name: 'duty_role', type: 'varchar', length: 120 }) dutyRole!: string;
  @Column({ type: 'varchar', length: 20, default: 'scheduled' }) status!: 'scheduled' | 'completed' | 'cancelled';
  @Column({ type: 'varchar', length: 2000, nullable: true }) notes!: string | null;
  @Column({ name: 'closure_note', type: 'varchar', length: 2000, nullable: true }) closureNote!: string | null;
  @Column({ name: 'assigned_by_id', type: 'int', unsigned: true, nullable: true }) assignedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'assigned_by_id' }) assignedBy!: User | null;
  @Column({ name: 'closed_by_id', type: 'int', unsigned: true, nullable: true }) closedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'closed_by_id' }) closedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
