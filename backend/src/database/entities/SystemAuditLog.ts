import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './User.js';

@Entity({ name: 'system_audit_logs' })
export class SystemAuditLog {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'request_id', type: 'varchar', length: 80, nullable: true }) requestId!: string | null;
  @Column({ name: 'user_id', type: 'int', unsigned: true, nullable: true }) userId!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'user_id' }) user!: User | null;
  @Column({ type: 'varchar', length: 10 }) method!: string;
  @Column({ type: 'varchar', length: 255 }) path!: string;
  @Column({ name: 'status_code', type: 'smallint', unsigned: true }) statusCode!: number;
  @Column({ type: 'varchar', length: 80, nullable: true }) module!: string | null;
  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true }) ipAddress!: string | null;
  @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true }) userAgent!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
