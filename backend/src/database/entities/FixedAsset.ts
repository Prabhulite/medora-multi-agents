import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'fixed_assets' })
@Index('uq_fixed_assets_code', ['code'], { unique: true })
export class FixedAsset {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 40 }) code!: string;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ type: 'varchar', length: 80 }) category!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) location!: string | null;
  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true }) serialNumber!: string | null;
  @Column({ name: 'purchase_date', type: 'date' }) purchaseDate!: string;
  @Column({ name: 'purchase_cost', type: 'decimal', precision: 14, scale: 2 }) purchaseCost!: string;
  @Column({ name: 'salvage_value', type: 'decimal', precision: 14, scale: 2, default: 0 }) salvageValue!: string;
  @Column({ name: 'useful_life_months', type: 'int', unsigned: true, nullable: true }) usefulLifeMonths!: number | null;
  @Column({ type: 'enum', enum: ['active', 'in_maintenance', 'disposed'], default: 'active' }) status!: 'active' | 'in_maintenance' | 'disposed';
  @Column({ name: 'disposal_date', type: 'date', nullable: true }) disposalDate!: string | null;
  @Column({ name: 'disposal_value', type: 'decimal', precision: 14, scale: 2, nullable: true }) disposalValue!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes!: string | null;
  @Column({ name: 'created_by_user_id', type: 'int', unsigned: true, nullable: true }) createdByUserId!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', precision: 6 }) updatedAt!: Date;
}
