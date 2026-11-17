import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DischargeHomeMedicationReview1731720000000 implements MigrationInterface {
  name = 'DischargeHomeMedicationReview1731720000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `discharge_home_medication_reviews` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `admission_id` int UNSIGNED NOT NULL, `home_medication_id` int UNSIGNED NOT NULL, `medicine_name` varchar(160) NOT NULL, `dosage` varchar(80) NULL, `frequency` varchar(80) NULL, `route` varchar(40) NULL, `source` varchar(20) NOT NULL, `decision` varchar(20) NOT NULL, `instructions` varchar(1000) NULL, `reason` varchar(1000) NULL, `reviewed_by_id` int UNSIGNED NULL, `reviewed_at` timestamp(6) NOT NULL, UNIQUE INDEX `UQ_discharge_home_admission_medication` (`admission_id`, `home_medication_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_discharge_home_admission` FOREIGN KEY (`admission_id`) REFERENCES `admissions`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_discharge_home_medication` FOREIGN KEY (`home_medication_id`) REFERENCES `home_medications`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_discharge_home_reviewer` FOREIGN KEY (`reviewed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `discharge_home_medication_reviews`'); }
}
