import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Bed } from './Bed.js';

@Entity({ name: 'wards' })
export class Ward {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 40, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ name: 'ward_type', type: 'varchar', length: 40, default: 'general' }) wardType!: string;
  @Column({ type: 'int', unsigned: true, default: 0 }) floor!: number;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @OneToMany(() => Bed, (bed) => bed.ward) beds!: Bed[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
