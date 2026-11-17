import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryVerification1731640000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` ADD `verified_at` timestamp(6) NULL, ADD `verified_by_id` int UNSIGNED NULL, ADD `released_by_id` int UNSIGNED NULL, ADD CONSTRAINT `FK_laboratory_verified_by` FOREIGN KEY (`verified_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL, ADD CONSTRAINT `FK_laboratory_released_by` FOREIGN KEY (`released_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` DROP FOREIGN KEY `FK_laboratory_verified_by`, DROP FOREIGN KEY `FK_laboratory_released_by`, DROP COLUMN `verified_at`, DROP COLUMN `verified_by_id`, DROP COLUMN `released_by_id`');
  }
}
