import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'menus' })
export class Menu {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ type: 'varchar', length: 160 })
  route!: string;

  @Column({ type: 'varchar', length: 60, default: 'dashboard' })
  icon!: string;

  @Column({ name: 'permission_code', type: 'varchar', length: 100, nullable: true })
  permissionCode!: string | null;

  @Column({ name: 'parent_id', type: 'int', unsigned: true, nullable: true })
  parentId!: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
