import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceivablesReportIndex1733200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_invoices_status_due_id` ON `invoices` (`status`, `due_date`, `id`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_invoices_status_due_id` ON `invoices`');
  }
}
