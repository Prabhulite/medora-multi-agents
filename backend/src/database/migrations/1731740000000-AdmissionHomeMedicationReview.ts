import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdmissionHomeMedicationReview1731740000000 implements MigrationInterface {
  name = 'AdmissionHomeMedicationReview1731740000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `admissions` ADD `admission_medications_reviewed_at` timestamp(6) NULL, ADD `admission_medications_reviewed_by_id` int UNSIGNED NULL');
    await queryRunner.query('CREATE TABLE `admission_home_medication_reviews` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `admission_id` int UNSIGNED NOT NULL, `home_medication_id` int UNSIGNED NOT NULL, `medicine_name` varchar(160) NOT NULL, `dosage` varchar(80) NULL, `frequency` varchar(80) NULL, `route` varchar(40) NULL, `source` varchar(20) NOT NULL, `source_detail` varchar(500) NULL, `decision` varchar(20) NOT NULL, `reason` varchar(1000) NULL, `reviewed_at` timestamp(6) NOT NULL, UNIQUE INDEX `UQ_admission_home_medication` (`admission_id`, `home_medication_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_admission_home_review_admission` FOREIGN KEY (`admission_id`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_admission_home_review_medication` FOREIGN KEY (`home_medication_id`) REFERENCES `home_medications`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `admission_home_medication_reviews`');
    await queryRunner.query('ALTER TABLE `admissions` DROP COLUMN `admission_medications_reviewed_by_id`, DROP COLUMN `admission_medications_reviewed_at`');
  }
}
