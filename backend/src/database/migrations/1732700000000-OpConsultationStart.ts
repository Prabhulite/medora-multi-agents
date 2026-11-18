import { MigrationInterface, QueryRunner } from 'typeorm';

export class OpConsultationStart1732700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `patient_visits` ADD `consultation_started_at` timestamp NULL, ADD `consultation_started_by_id` int UNSIGNED NULL');
    await queryRunner.query('ALTER TABLE `patient_visits` ADD CONSTRAINT `FK_patient_visits_consultation_staff` FOREIGN KEY (`consultation_started_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
    await queryRunner.query('CREATE INDEX `IDX_patient_visits_doctor_date_token` ON `patient_visits` (`doctor_id`, `visit_at`, `token_number`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_patient_visits_doctor_date_token` ON `patient_visits`');
    await queryRunner.query('ALTER TABLE `patient_visits` DROP FOREIGN KEY `FK_patient_visits_consultation_staff`');
    await queryRunner.query('ALTER TABLE `patient_visits` DROP COLUMN `consultation_started_by_id`, DROP COLUMN `consultation_started_at`');
  }
}
