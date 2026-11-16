import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CommunicationFollowUp1731530000000 implements MigrationInterface {
  name = 'CommunicationFollowUp1731530000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `patient_communications` ADD `follow_up_completed_at` datetime(6) NULL, ADD `follow_up_completed_by_id` int UNSIGNED NULL, ADD `follow_up_completion_note` varchar(1000) NULL, ADD CONSTRAINT `FK_communications_follow_up_completer` FOREIGN KEY (`follow_up_completed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
    await queryRunner.query('CREATE INDEX `IDX_communications_open_follow_up` ON `patient_communications` (`follow_up_completed_at`, `follow_up_due_at`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_communications_open_follow_up` ON `patient_communications`');
    await queryRunner.query('ALTER TABLE `patient_communications` DROP FOREIGN KEY `FK_communications_follow_up_completer`, DROP COLUMN `follow_up_completion_note`, DROP COLUMN `follow_up_completed_by_id`, DROP COLUMN `follow_up_completed_at`');
  }
}
