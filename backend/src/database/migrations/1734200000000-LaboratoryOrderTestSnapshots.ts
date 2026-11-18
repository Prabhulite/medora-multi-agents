import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryOrderTestSnapshots1734200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` ADD `test_code_snapshot` varchar(40) NULL, ADD `test_name_snapshot` varchar(180) NULL');
    await queryRunner.query('UPDATE `laboratory_orders` orders INNER JOIN `laboratory_tests` tests ON tests.id = orders.test_id SET orders.test_code_snapshot = tests.test_code, orders.test_name_snapshot = tests.test_name WHERE orders.test_code_snapshot IS NULL OR orders.test_name_snapshot IS NULL');
    await queryRunner.query('ALTER TABLE `laboratory_orders` MODIFY `test_code_snapshot` varchar(40) NOT NULL, MODIFY `test_name_snapshot` varchar(180) NOT NULL, ADD INDEX `IDX_laboratory_orders_test_name_snapshot` (`test_name_snapshot`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` DROP INDEX `IDX_laboratory_orders_test_name_snapshot`, DROP COLUMN `test_name_snapshot`, DROP COLUMN `test_code_snapshot`');
  }
}
