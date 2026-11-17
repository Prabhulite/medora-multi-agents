import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { RadiologyModality } from './RadiologyModality.js';

@Entity({ name: 'radiology_resources' })
export class RadiologyResource {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 40, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ type: 'varchar', length: 160, nullable: true }) location!: string | null;
  @Column({ name: 'modality_id', type: 'int', unsigned: true }) modalityId!: number;
  @ManyToOne(() => RadiologyModality, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'modality_id' }) modality!: RadiologyModality;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 6 }) updatedAt!: Date;
}
