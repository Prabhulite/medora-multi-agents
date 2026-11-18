import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FefoOverrideReason1733300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `stock_transactions` ADD `fefo_override_reason` varchar(500) NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `stock_transactions` DROP COLUMN `fefo_override_reason`');
  }
}
