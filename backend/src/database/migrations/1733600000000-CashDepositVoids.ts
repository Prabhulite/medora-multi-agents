import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CashDepositVoids1733600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `cash_deposits` ADD `voided_at` timestamp(6) NULL, ADD `voided_by_id` int UNSIGNED NULL, ADD `void_reason` varchar(500) NULL, ADD CONSTRAINT `FK_cash_deposits_void_user` FOREIGN KEY (`voided_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `cash_deposits` DROP FOREIGN KEY `FK_cash_deposits_void_user`, DROP COLUMN `void_reason`, DROP COLUMN `voided_by_id`, DROP COLUMN `voided_at`');
  }
}
