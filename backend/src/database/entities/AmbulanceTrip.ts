import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { AmbulanceVehicle } from './AmbulanceVehicle.js';
import { Patient } from './Patient.js';
import { User } from './User.js';

@Entity({ name: 'ambulance_trips' })
export class AmbulanceTrip {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'trip_number', type: 'varchar', length: 40, unique: true }) tripNumber!: string;
  @Column({ name: 'vehicle_id', type: 'int', unsigned: true }) vehicleId!: number;
  @ManyToOne(() => AmbulanceVehicle, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'vehicle_id' }) vehicle!: AmbulanceVehicle;
  @Column({ name: 'driver_id', type: 'int', unsigned: true }) driverId!: number;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'driver_id' }) driver!: User;
  @Column({ name: 'patient_id', type: 'int', unsigned: true, nullable: true }) patientId!: number | null;
  @ManyToOne(() => Patient, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'patient_id' }) patient!: Patient | null;
  @Column({ name: 'pickup_location', type: 'varchar', length: 500 }) pickupLocation!: string;
  @Column({ name: 'destination', type: 'varchar', length: 500 }) destination!: string;
  @Column({ type: 'varchar', length: 20, default: 'assigned' }) status!: 'assigned' | 'en_route' | 'on_scene' | 'transporting' | 'completed' | 'cancelled';
  @Column({ type: 'varchar', length: 2000, nullable: true }) notes!: string | null;
  @Column({ name: 'closure_note', type: 'varchar', length: 2000, nullable: true }) closureNote!: string | null;
  @Column({ name: 'dispatched_at', type: 'timestamp' }) dispatchedAt!: Date;
  @Column({ name: 'departed_at', type: 'timestamp', nullable: true }) departedAt!: Date | null;
  @Column({ name: 'scene_at', type: 'timestamp', nullable: true }) sceneAt!: Date | null;
  @Column({ name: 'transporting_at', type: 'timestamp', nullable: true }) transportingAt!: Date | null;
  @Column({ name: 'closed_at', type: 'timestamp', nullable: true }) closedAt!: Date | null;
  @Column({ name: 'dispatched_by_id', type: 'int', unsigned: true, nullable: true }) dispatchedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'dispatched_by_id' }) dispatchedBy!: User | null;
  @Column({ name: 'updated_by_id', type: 'int', unsigned: true, nullable: true }) updatedById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'updated_by_id' }) updatedBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' }) updatedAt!: Date;
}
