import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryAddendumApproval1733800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `laboratory_result_addenda` ADD `approved_by_id` int UNSIGNED NULL, ADD `approved_at` timestamp(6) NULL, ADD CONSTRAINT `FK_lab_addendum_approved_user` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT');
    await queryRunner.query('UPDATE `laboratory_result_addenda` SET `approved_by_id` = `created_by_id`, `approved_at` = `created_at` WHERE `approved_at` IS NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE `laboratory_result_addenda` DROP FOREIGN KEY `FK_lab_addendum_approved_user`, DROP COLUMN `approved_at`, DROP COLUMN `approved_by_id`'); }
}
