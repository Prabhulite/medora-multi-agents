import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EncounterSigning1731510000000 implements MigrationInterface {
  name = 'EncounterSigning1731510000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `clinical_encounters` ADD `signed_at` timestamp(6) NULL, ADD `signed_by_id` int UNSIGNED NULL, ADD CONSTRAINT `FK_clinical_encounters_signer` FOREIGN KEY (`signed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `clinical_encounters` DROP FOREIGN KEY `FK_clinical_encounters_signer`, DROP COLUMN `signed_by_id`, DROP COLUMN `signed_at`');
  }
}
