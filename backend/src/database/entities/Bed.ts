import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Ward } from './Ward.js';

@Entity({ name: 'beds' })
export class Bed {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'ward_id', type: 'int', unsigned: true }) wardId!: number;
  @ManyToOne(() => Ward, (ward) => ward.beds, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'ward_id' }) ward!: Ward;
  @Column({ type: 'varchar', length: 40 }) number!: string;
  @Column({ type: 'varchar', length: 30, default: 'available' }) status!: 'available' | 'occupied' | 'maintenance';
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
