import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'vaccines' })
export class Vaccine {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 40, unique: true }) code!: string;
  @Column({ type: 'varchar', length: 160 }) name!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
}
