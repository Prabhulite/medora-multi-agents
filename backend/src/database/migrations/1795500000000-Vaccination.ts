import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Vaccination1795500000000 implements MigrationInterface {
  name = 'Vaccination1795500000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE TABLE `vaccines` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `code` varchar(40) NOT NULL, `name` varchar(160) NOT NULL, `is_active` tinyint NOT NULL DEFAULT 1, UNIQUE INDEX `IDX_vaccine_code` (`code`), PRIMARY KEY (`id`)) ENGINE=InnoDB');
    await q.query('CREATE TABLE `patient_immunizations` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `patient_id` int UNSIGNED NOT NULL, `vaccine_id` int UNSIGNED NOT NULL, `dose_number` int UNSIGNED NOT NULL, `administered_on` date NOT NULL, `next_due_on` date NULL, `lotNumber` varchar(120) NULL, `remarks` varchar(500) NULL, `recorded_by_user_id` int UNSIGNED NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`), INDEX `idx_immunization_patient_date` (`patient_id`, `administered_on`), UNIQUE INDEX `uq_immunization_dose` (`patient_id`, `vaccine_id`, `dose_number`), INDEX `IDX_immunization_vaccine` (`vaccine_id`), CONSTRAINT `FK_immunization_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_immunization_vaccine` FOREIGN KEY (`vaccine_id`) REFERENCES `vaccines`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_immunization_user` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB');
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('DROP TABLE `patient_immunizations`');
    await q.query('DROP TABLE `vaccines`');
  }
}
