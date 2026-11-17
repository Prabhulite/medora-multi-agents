import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RadiologyCancellation1731810000000 implements MigrationInterface {
  name = 'RadiologyCancellation1731810000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `radiology_orders` ADD `cancelled_at` timestamp(6) NULL, ADD `cancelled_by_id` int UNSIGNED NULL, ADD `cancellation_reason` varchar(500) NULL, ADD CONSTRAINT `FK_radiology_cancelled_by` FOREIGN KEY (`cancelled_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `radiology_orders` DROP FOREIGN KEY `FK_radiology_cancelled_by`, DROP COLUMN `cancellation_reason`, DROP COLUMN `cancelled_by_id`, DROP COLUMN `cancelled_at`');
  }
}
