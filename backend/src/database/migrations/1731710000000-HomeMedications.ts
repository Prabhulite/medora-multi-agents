import type { MigrationInterface, QueryRunner } from 'typeorm';

export class HomeMedications1731710000000 implements MigrationInterface {
  name = 'HomeMedications1731710000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `home_medications` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `patient_id` int UNSIGNED NOT NULL, `medicine_name` varchar(160) NOT NULL, `dosage` varchar(80) NULL, `frequency` varchar(80) NULL, `route` varchar(40) NULL, `source` varchar(20) NOT NULL, `source_detail` varchar(500) NULL, `is_current` tinyint NOT NULL DEFAULT 1, `recorded_by_id` int UNSIGNED NULL, `recorded_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `ceased_at` timestamp(6) NULL, `ceased_by_id` int UNSIGNED NULL, `cessation_reason` varchar(500) NULL, INDEX `IDX_home_medications_patient_current` (`patient_id`, `is_current`), PRIMARY KEY (`id`), CONSTRAINT `FK_home_medications_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_home_medications_recorder` FOREIGN KEY (`recorded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL, CONSTRAINT `FK_home_medications_ceaser` FOREIGN KEY (`ceased_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `home_medications`'); }
}
