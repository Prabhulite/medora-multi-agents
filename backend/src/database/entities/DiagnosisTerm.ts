import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'diagnosis_terms' })
export class DiagnosisTerm {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 20 }) system!: 'local' | 'ICD-10' | 'ICD-11';
  @Column({ type: 'varchar', length: 40 }) code!: string;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ type: 'varchar', length: 40, default: '' }) version!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
