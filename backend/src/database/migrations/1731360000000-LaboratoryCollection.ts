import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryCollection1731360000000 implements MigrationInterface {
  name = 'LaboratoryCollection1731360000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` ADD `specimen_label` varchar(80) NULL, ADD `collected_by_id` int UNSIGNED NULL');
    await queryRunner.query('ALTER TABLE `laboratory_orders` ADD CONSTRAINT `FK_lab_collected_by` FOREIGN KEY (`collected_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_orders` DROP FOREIGN KEY `FK_lab_collected_by`');
    await queryRunner.query('ALTER TABLE `laboratory_orders` DROP COLUMN `collected_by_id`, DROP COLUMN `specimen_label`');
  }
}
