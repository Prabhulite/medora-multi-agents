import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AutomationSettings1795200000000 implements MigrationInterface {
  name = 'AutomationSettings1795200000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `automation_settings` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `recipient_id` int UNSIGNED NOT NULL, `appointment_enabled` tinyint(1) NOT NULL DEFAULT 0, `appointment_hours` int UNSIGNED NOT NULL DEFAULT 24, `prescription_enabled` tinyint(1) NOT NULL DEFAULT 0, `prescription_days` int UNSIGNED NOT NULL DEFAULT 3, `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_automation_settings_recipient` (`recipient_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_automation_settings_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `automation_settings`');
  }
}
