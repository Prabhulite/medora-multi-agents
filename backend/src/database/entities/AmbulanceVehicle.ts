import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'ambulance_vehicles' })
export class AmbulanceVehicle {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ type: 'varchar', length: 40, unique: true }) code!: string;
  @Column({ name: 'registration_number', type: 'varchar', length: 40, unique: true }) registrationNumber!: string;
  @Column({ type: 'varchar', length: 120 }) name!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
