import type { MigrationInterface, QueryRunner } from 'typeorm';
export class DischargeSummaries1731320000000 implements MigrationInterface {
  name = 'DischargeSummaries1731320000000';
  public async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE `admissions` ADD COLUMN `discharge_summary` text NULL, ADD COLUMN `discharge_diagnosis` text NULL, ADD COLUMN `discharge_medications` text NULL, ADD COLUMN `follow_up_instructions` text NULL, ADD COLUMN `discharged_by_id` int UNSIGNED NULL, ADD CONSTRAINT `FK_admissions_discharged_by` FOREIGN KEY (`discharged_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE'); }
  public async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE `admissions` DROP FOREIGN KEY `FK_admissions_discharged_by`, DROP COLUMN `discharged_by_id`, DROP COLUMN `follow_up_instructions`, DROP COLUMN `discharge_medications`, DROP COLUMN `discharge_diagnosis`, DROP COLUMN `discharge_summary`'); }
}
