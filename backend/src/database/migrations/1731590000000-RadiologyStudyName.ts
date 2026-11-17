import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RadiologyStudyName1731590000000 implements MigrationInterface {
  name = 'RadiologyStudyName1731590000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `radiology_orders` ADD `study_name` varchar(160) NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `radiology_orders` DROP COLUMN `study_name`');
  }
}
