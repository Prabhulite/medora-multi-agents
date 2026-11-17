import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'doctor_account_link_events' })
export class DoctorAccountLinkEvent {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'doctor_id', type: 'int', unsigned: true }) doctorId!: number;
  @Column({ name: 'from_user_id', type: 'int', unsigned: true, nullable: true }) fromUserId!: number | null;
  @Column({ name: 'to_user_id', type: 'int', unsigned: true, nullable: true }) toUserId!: number | null;
  @Column({ name: 'actor_id', type: 'int', unsigned: true }) actorId!: number;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
