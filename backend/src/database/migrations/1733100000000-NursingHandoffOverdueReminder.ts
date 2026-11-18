import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffOverdueReminder1733100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `nursing_handoffs` ADD `overdue_reminded_at` timestamp(6) NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `nursing_handoffs` DROP COLUMN `overdue_reminded_at`');
  }
}
