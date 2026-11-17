import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClinicalEncounterRevision1732600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `clinical_encounters` ADD `revision` int NOT NULL DEFAULT 1');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `clinical_encounters` DROP COLUMN `revision`');
  }
}
