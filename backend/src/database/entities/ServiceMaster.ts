import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Department } from './Department.js';
import { ServiceCategory } from './ServiceCategory.js';

export type ServiceCareType = 'OP' | 'IP' | 'Both';

@Entity({ name: 'service_master' })
export class ServiceMaster {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'service_code', type: 'varchar', length: 40, unique: true })
  serviceCode!: string;

  @Column({ name: 'service_name', type: 'varchar', length: 160 })
  serviceName!: string;

  @Column({ name: 'category_id', type: 'int', unsigned: true })
  categoryId!: number;

  @ManyToOne(() => ServiceCategory, (category) => category.services, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategory;

  @Column({ name: 'department_id', type: 'int', unsigned: true })
  departmentId!: number;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department!: Department;

  @Column({ name: 'service_type', type: 'varchar', length: 10 })
  serviceType!: ServiceCareType;

  @Column({ name: 'default_price', type: 'decimal', precision: 12, scale: 2 })
  defaultPrice!: string;

  @Column({ name: 'tax_percent', type: 'decimal', precision: 5, scale: 2, nullable: true })
  taxPercent!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'billing_applicable', type: 'varchar', length: 10, default: 'Both' })
  billingApplicable!: ServiceCareType;

  @Column({ name: 'allow_discount', type: 'boolean', default: true })
  allowDiscount!: boolean;

  @Column({
    name: 'default_discount_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  defaultDiscountPercent!: string | null;

  @Column({ name: 'allow_quantity', type: 'boolean', default: true })
  allowQuantity!: boolean;

  @Column({ name: 'default_quantity', type: 'decimal', precision: 10, scale: 2, default: 1 })
  defaultQuantity!: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: string;

  @Column({ name: 'branch_name', type: 'varchar', length: 120, nullable: true })
  branchName!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
