import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BloodBankUnits1731560000000 implements MigrationInterface {
  name = 'BloodBankUnits1731560000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `blood_units` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `unit_number` varchar(80) NOT NULL, `component` varchar(40) NOT NULL, `blood_group` varchar(3) NOT NULL, `collected_on` date NOT NULL, `expires_on` date NOT NULL, `storage_location` varchar(120) NOT NULL, `status` varchar(20) NOT NULL DEFAULT 'quarantined', `screening_reference` varchar(120) NULL, `issued_patient_id` int UNSIGNED NULL, `crossmatch_reference` varchar(120) NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_blood_units_number` (`unit_number`), INDEX `IDX_blood_units_status_expiry` (`status`, `expires_on`), INDEX `IDX_blood_units_patient` (`issued_patient_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_blood_units_patient` FOREIGN KEY (`issued_patient_id`) REFERENCES `patients`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB");
    await queryRunner.query("CREATE TABLE `blood_unit_events` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `unit_id` int UNSIGNED NOT NULL, `from_status` varchar(20) NULL, `to_status` varchar(20) NOT NULL, `reference` varchar(200) NULL, `actor_id` int UNSIGNED NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_blood_unit_events_unit` (`unit_id`, `created_at`), PRIMARY KEY (`id`), CONSTRAINT `FK_blood_unit_events_unit` FOREIGN KEY (`unit_id`) REFERENCES `blood_units`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_blood_unit_events_actor` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `blood_unit_events`');
    await queryRunner.query('DROP TABLE `blood_units`');
  }
}
