import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryOrderContext1731650000000 implements MigrationInterface {
  name = 'LaboratoryOrderContext1731650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE `laboratory_orders` ADD `priority` varchar(10) NOT NULL DEFAULT 'routine', ADD `clinical_notes` text NULL");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` DROP COLUMN `clinical_notes`, DROP COLUMN `priority`');
  }
}
