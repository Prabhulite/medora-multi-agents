import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryWorklistIndexes1731690000000 implements MigrationInterface {
  name = 'LaboratoryWorklistIndexes1731690000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` ADD INDEX `IDX_laboratory_orders_worklist` (`ordered_at`, `id`), ADD INDEX `IDX_laboratory_orders_status_worklist` (`status`, `ordered_at`, `id`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` DROP INDEX `IDX_laboratory_orders_status_worklist`, DROP INDEX `IDX_laboratory_orders_worklist`');
  }
}
