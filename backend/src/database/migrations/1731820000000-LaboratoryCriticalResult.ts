import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryCriticalResult1731820000000 implements MigrationInterface {
  name = 'LaboratoryCriticalResult1731820000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` ADD `critical_result` tinyint NOT NULL DEFAULT 0, ADD `critical_reason` varchar(500) NULL');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` DROP COLUMN `critical_reason`, DROP COLUMN `critical_result`');
  }
}
