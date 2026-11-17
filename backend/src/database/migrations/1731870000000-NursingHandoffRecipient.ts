import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffRecipient1731870000000 implements MigrationInterface {
  name = 'NursingHandoffRecipient1731870000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `nursing_handoffs` ADD `recipient_id` int UNSIGNED NULL');
    await queryRunner.query('CREATE INDEX `IDX_nursing_handoffs_recipient_pending` ON `nursing_handoffs` (`recipient_id`, `acknowledged_at`)');
    await queryRunner.query('ALTER TABLE `nursing_handoffs` ADD CONSTRAINT `FK_nursing_handoff_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `nursing_handoffs` DROP FOREIGN KEY `FK_nursing_handoff_recipient`');
    await queryRunner.query('DROP INDEX `IDX_nursing_handoffs_recipient_pending` ON `nursing_handoffs`');
    await queryRunner.query('ALTER TABLE `nursing_handoffs` DROP COLUMN `recipient_id`');
  }
}
