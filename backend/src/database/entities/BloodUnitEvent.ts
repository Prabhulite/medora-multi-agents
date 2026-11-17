import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { BloodUnitStatus } from './BloodUnit.js';

@Entity({ name: 'blood_unit_events' })
export class BloodUnitEvent {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'unit_id', type: 'int', unsigned: true }) unitId!: number;
  @Column({ name: 'from_status', type: 'varchar', length: 20, nullable: true }) fromStatus!: BloodUnitStatus | null;
  @Column({ name: 'to_status', type: 'varchar', length: 20 }) toStatus!: BloodUnitStatus;
  @Column({ type: 'varchar', length: 200, nullable: true }) reference!: string | null;
  @Column({ name: 'actor_id', type: 'int', unsigned: true }) actorId!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
