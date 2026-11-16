import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User.js';

@Entity({ name: 'ambulance_drivers' })
export class AmbulanceDriver {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'staff_id', type: 'int', unsigned: true, unique: true }) staffId!: number;
  @OneToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'staff_id' }) staff!: User;
  @Column({ name: 'license_number', type: 'varchar', length: 80, unique: true }) licenseNumber!: string;
  @Column({ name: 'license_valid_until', type: 'date' }) licenseValidUntil!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
