import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceMaster } from './ServiceMaster.js';

@Entity({ name: 'service_categories' })
export class ServiceCategory {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'sort_order', type: 'int', unsigned: true, default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => ServiceMaster, (service) => service.category)
  services!: ServiceMaster[];
}
