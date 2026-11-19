import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'fixed_asset_maintenance' })
@Index('idx_fixed_asset_maintenance_asset_date', ['assetId', 'performedOn'])
export class FixedAssetMaintenance {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'asset_id', type: 'int', unsigned: true }) assetId!: number;
  @Column({ name: 'performed_on', type: 'date' }) performedOn!: string;
  @Column({ type: 'varchar', length: 160 }) description!: string;
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 }) cost!: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) provider!: string | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) notes!: string | null;
  @Column({ name: 'created_by_user_id', type: 'int', unsigned: true, nullable: true }) createdByUserId!: number | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', precision: 6 }) createdAt!: Date;
}
