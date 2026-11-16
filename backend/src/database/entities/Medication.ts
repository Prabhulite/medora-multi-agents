import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'medications' })
export class Medication {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'medicine_code', type: 'varchar', length: 40, unique: true }) medicineCode!: string;
  @Column({ name: 'generic_name', type: 'varchar', length: 160 }) genericName!: string;
  @Column({ name: 'brand_name', type: 'varchar', length: 160 }) brandName!: string;
  @Column({ type: 'varchar', length: 40 }) form!: string;
  @Column({ type: 'varchar', length: 80, nullable: true }) strength!: string | null;
  @Column({ type: 'varchar', length: 20, nullable: true }) unit!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
