import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PrescriptionFulfillment1731410000000 implements MigrationInterface {
  name = 'PrescriptionFulfillment1731410000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `prescriptions` ADD `quantity_prescribed` int UNSIGNED NULL');
    await queryRunner.query('ALTER TABLE `stock_transactions` ADD `prescription_id` int UNSIGNED NULL, ADD INDEX `IDX_stock_prescription` (`prescription_id`), ADD CONSTRAINT `FK_stock_prescription` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `stock_transactions` DROP FOREIGN KEY `FK_stock_prescription`, DROP INDEX `IDX_stock_prescription`, DROP COLUMN `prescription_id`');
    await queryRunner.query('ALTER TABLE `prescriptions` DROP COLUMN `quantity_prescribed`');
  }
}
