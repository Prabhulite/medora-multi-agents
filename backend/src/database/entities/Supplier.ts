import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'suppliers' })
export class Supplier {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 40, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 180 }) name!: string;
  @Column({ name: 'contact_person', type: 'varchar', length: 160, nullable: true }) contactPerson!: string | null;
  @Column({ type: 'varchar', length: 40, nullable: true }) phone!: string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) email!: string | null;
  @Column({ type: 'text', nullable: true }) address!: string | null;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
