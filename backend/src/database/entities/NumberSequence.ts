import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'number_sequences' })
export class NumberSequence {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'sequence_key', type: 'varchar', length: 40 })
  sequenceKey!: string;

  @Column({ type: 'varchar', length: 20 })
  prefix!: string;

  @Column({ name: 'year_code', type: 'varchar', length: 4 })
  yearCode!: string;

  @Column({ name: 'last_number', type: 'int', unsigned: true, default: 0 })
  lastNumber!: number;

  @Column({ name: 'pad_length', type: 'tinyint', unsigned: true, default: 6 })
  padLength!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
