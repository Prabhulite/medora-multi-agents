import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdmissionHomeMedicationReviewer1731750000000 implements MigrationInterface {
  name = 'AdmissionHomeMedicationReviewer1731750000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `admission_home_medication_reviews` ADD `reviewed_by_id` int UNSIGNED NULL');
    await queryRunner.query('UPDATE `admission_home_medication_reviews` review_row INNER JOIN `admissions` admission ON admission.id = review_row.admission_id SET review_row.reviewed_by_id = admission.admission_medications_reviewed_by_id');
    await queryRunner.query('ALTER TABLE `admission_home_medication_reviews` ADD CONSTRAINT `FK_admission_home_review_reviewer` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `admission_home_medication_reviews` DROP FOREIGN KEY `FK_admission_home_review_reviewer`');
    await queryRunner.query('ALTER TABLE `admission_home_medication_reviews` DROP COLUMN `reviewed_by_id`');
  }
}
