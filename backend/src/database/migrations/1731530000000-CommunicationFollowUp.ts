import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CommunicationFollowUp1731530000000 implements MigrationInterface {
  name = 'CommunicationFollowUp1731530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('patient_communications', 'follow_up_completed_at'))) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` ADD `follow_up_completed_at` datetime(6) NULL',
      );
    }
    if (!(await queryRunner.hasColumn('patient_communications', 'follow_up_completed_by_id'))) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` ADD `follow_up_completed_by_id` int UNSIGNED NULL',
      );
    }
    if (!(await queryRunner.hasColumn('patient_communications', 'follow_up_completion_note'))) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` ADD `follow_up_completion_note` varchar(1000) NULL',
      );
    }

    const table = await queryRunner.getTable('patient_communications');
    if (
      table &&
      !table.foreignKeys.some((fk) => fk.name === 'FK_communications_follow_up_completer')
    ) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` ADD CONSTRAINT `FK_communications_follow_up_completer` FOREIGN KEY (`follow_up_completed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL',
      );
    }

    if (
      table &&
      !table.indices.some((idx) => idx.name === 'IDX_communications_open_follow_up')
    ) {
      await queryRunner.query(
        'CREATE INDEX `IDX_communications_open_follow_up` ON `patient_communications` (`follow_up_completed_at`, `follow_up_due_at`)',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patient_communications');
    if (table?.indices.some((idx) => idx.name === 'IDX_communications_open_follow_up')) {
      await queryRunner.query(
        'DROP INDEX `IDX_communications_open_follow_up` ON `patient_communications`',
      );
    }
    if (
      table?.foreignKeys.some((fk) => fk.name === 'FK_communications_follow_up_completer')
    ) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` DROP FOREIGN KEY `FK_communications_follow_up_completer`',
      );
    }
    if (await queryRunner.hasColumn('patient_communications', 'follow_up_completion_note')) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` DROP COLUMN `follow_up_completion_note`',
      );
    }
    if (await queryRunner.hasColumn('patient_communications', 'follow_up_completed_by_id')) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` DROP COLUMN `follow_up_completed_by_id`',
      );
    }
    if (await queryRunner.hasColumn('patient_communications', 'follow_up_completed_at')) {
      await queryRunner.query(
        'ALTER TABLE `patient_communications` DROP COLUMN `follow_up_completed_at`',
      );
    }
  }
}
