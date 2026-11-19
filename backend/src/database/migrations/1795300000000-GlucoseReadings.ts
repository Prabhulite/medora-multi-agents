import type { MigrationInterface, QueryRunner } from 'typeorm';

export class GlucoseReadings1795300000000 implements MigrationInterface {
  name = 'GlucoseReadings1795300000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE TABLE `glucose_readings` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `patient_id` int UNSIGNED NOT NULL, `value_mg_dl` decimal(6,1) NOT NULL, `context` varchar(20) NOT NULL, `measured_at` datetime(3) NOT NULL, `notes` varchar(1000) NULL, `recorded_by_user_id` int UNSIGNED NOT NULL, `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX `idx_glucose_patient_measured` (`patient_id`, `measured_at`), CONSTRAINT `FK_glucose_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_glucose_author` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT, PRIMARY KEY (`id`)) ENGINE=InnoDB');
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE `glucose_readings`'); }
}
