import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ClinicalEncounter } from './ClinicalEncounter.js';
import { User } from './User.js';

@Entity({ name: 'clinical_encounter_addenda' })
export class ClinicalEncounterAddendum {
  @PrimaryGeneratedColumn({ unsigned: true }) id!: number;
  @Column({ name: 'encounter_id', type: 'int', unsigned: true }) encounterId!: number;
  @ManyToOne(() => ClinicalEncounter, (encounter) => encounter.addenda, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'encounter_id' }) encounter!: ClinicalEncounter;
  @Column({ type: 'varchar', length: 255 }) reason!: string;
  @Column({ type: 'text' }) addendum!: string;
  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true }) createdById!: number | null;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'created_by_id' }) createdBy!: User | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' }) createdAt!: Date;
}
