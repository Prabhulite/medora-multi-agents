import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryQuarantine1733400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `inventory_batches` ADD `is_quarantined` tinyint NOT NULL DEFAULT 0');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `inventory_batches` DROP COLUMN `is_quarantined`');
  }
}
