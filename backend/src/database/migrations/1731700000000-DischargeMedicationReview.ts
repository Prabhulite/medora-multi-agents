import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DischargeMedicationReview1731700000000 implements MigrationInterface {
  name = 'DischargeMedicationReview1731700000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `admissions` ADD `medications_reviewed_at` timestamp(6) NULL, ADD `medications_reviewed_by_id` int UNSIGNED NULL, ADD CONSTRAINT `FK_admissions_medications_reviewer` FOREIGN KEY (`medications_reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
    await queryRunner.query('CREATE TABLE `discharge_medication_reviews` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `admission_id` int UNSIGNED NOT NULL, `prescription_id` int UNSIGNED NOT NULL, `medicine_name` varchar(160) NOT NULL, `dosage` varchar(80) NULL, `frequency` varchar(80) NULL, `route` varchar(40) NOT NULL, `decision` varchar(20) NOT NULL, `instructions` varchar(1000) NULL, `reason` varchar(1000) NULL, `reviewed_by_id` int UNSIGNED NULL, `reviewed_at` timestamp(6) NOT NULL, UNIQUE INDEX `UQ_discharge_medication_admission_prescription` (`admission_id`, `prescription_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_discharge_medication_admission` FOREIGN KEY (`admission_id`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_discharge_medication_prescription` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_discharge_medication_reviewer` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `discharge_medication_reviews`');
    await queryRunner.query('ALTER TABLE `admissions` DROP FOREIGN KEY `FK_admissions_medications_reviewer`, DROP COLUMN `medications_reviewed_by_id`, DROP COLUMN `medications_reviewed_at`');
  }
}
