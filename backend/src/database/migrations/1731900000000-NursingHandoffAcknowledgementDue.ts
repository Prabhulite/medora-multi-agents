import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffAcknowledgementDue1731900000000 implements MigrationInterface {
  name = 'NursingHandoffAcknowledgementDue1731900000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `nursing_handoffs` ADD `acknowledgement_due_at` datetime(6) NULL');
    await queryRunner.query('CREATE INDEX `IDX_nursing_handoffs_ack_due` ON `nursing_handoffs` (`acknowledgement_due_at`, `acknowledged_at`, `closed_on_discharge_at`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_nursing_handoffs_ack_due` ON `nursing_handoffs`');
    await queryRunner.query('ALTER TABLE `nursing_handoffs` DROP COLUMN `acknowledgement_due_at`');
  }
}
