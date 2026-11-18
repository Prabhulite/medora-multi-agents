import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RegistrationSource } from './RegistrationSource.js';
import { User } from './User.js';

@Entity({ name: 'registration_source_events' })
export class RegistrationSourceEvent {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'source_id', type: 'int', unsigned: true }) sourceId!: number;
  @ManyToOne(() => RegistrationSource, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'source_id' }) source!: RegistrationSource;
  @Column({ type: 'varchar', length: 20 }) action!: 'created' | 'renamed' | 'retired' | 'reactivated' | 'updated';
  @Column({ name: 'before_name', type: 'varchar', length: 120, nullable: true }) beforeName!: string | null;
  @Column({ name: 'after_name', type: 'varchar', length: 120 }) afterName!: string;
  @Column({ name: 'before_active', type: 'boolean', nullable: true }) beforeActive!: boolean | null;
  @Column({ name: 'after_active', type: 'boolean' }) afterActive!: boolean;
  @Column({ name: 'actor_id', type: 'int', unsigned: true, nullable: true }) actorId!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' }) actor!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
