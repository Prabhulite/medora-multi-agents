import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DischargeHomeMedicationSourceDetail1731730000000 implements MigrationInterface {
  name = 'DischargeHomeMedicationSourceDetail1731730000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `discharge_home_medication_reviews` ADD `source_detail` varchar(255) NULL AFTER `source`');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `discharge_home_medication_reviews` DROP COLUMN `source_detail`');
  }
}
