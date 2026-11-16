import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DutyShifts1731460000000 implements MigrationInterface {
  name = 'DutyShifts1731460000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `duty_shifts` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `staff_id` int UNSIGNED NOT NULL, `starts_at` timestamp(6) NOT NULL, `ends_at` timestamp(6) NOT NULL, `location` varchar(120) NOT NULL, `duty_role` varchar(120) NOT NULL, `status` varchar(20) NOT NULL DEFAULT 'scheduled', `notes` varchar(2000) NULL, `closure_note` varchar(2000) NULL, `assigned_by_id` int UNSIGNED NULL, `closed_by_id` int UNSIGNED NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX `IDX_shift_staff_time` (`staff_id`, `starts_at`, `ends_at`), INDEX `IDX_shift_start_status` (`starts_at`, `status`), PRIMARY KEY (`id`), CONSTRAINT `FK_shift_staff` FOREIGN KEY (`staff_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_shift_assigned_by` FOREIGN KEY (`assigned_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL, CONSTRAINT `FK_shift_closed_by` FOREIGN KEY (`closed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `duty_shifts`'); }
}
