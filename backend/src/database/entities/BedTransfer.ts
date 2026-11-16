import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Admission } from './Admission.js';
import { Bed } from './Bed.js';
import { User } from './User.js';

@Entity({ name: 'bed_transfers' })
export class BedTransfer {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'admission_id', type: 'int', unsigned: true }) admissionId!: number;
  @ManyToOne(() => Admission, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'admission_id' }) admission!: Admission;
  @Column({ name: 'from_bed_id', type: 'int', unsigned: true }) fromBedId!: number;
  @ManyToOne(() => Bed, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'from_bed_id' }) fromBed!: Bed;
  @Column({ name: 'to_bed_id', type: 'int', unsigned: true }) toBedId!: number;
  @ManyToOne(() => Bed, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'to_bed_id' }) toBed!: Bed;
  @Column({ type: 'varchar', length: 500 }) reason!: string;
  @Column({ name: 'transferred_by_id', type: 'int', unsigned: true, nullable: true }) transferredById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'transferred_by_id' }) transferredBy!: User | null;
  @CreateDateColumn({ name: 'transferred_at', type: 'timestamp', precision: 6 }) transferredAt!: Date;
}
