import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DoctorAccountLinks1731580000000 implements MigrationInterface {
  name = 'DoctorAccountLinks1731580000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `doctor_master` ADD `account_user_id` int UNSIGNED NULL');
    await queryRunner.query('CREATE UNIQUE INDEX `UQ_doctor_master_account_user` ON `doctor_master` (`account_user_id`)');
    await queryRunner.query('ALTER TABLE `doctor_master` ADD CONSTRAINT `FK_doctor_master_account_user` FOREIGN KEY (`account_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT');
    await queryRunner.query("CREATE TABLE `doctor_account_link_events` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `doctor_id` int UNSIGNED NOT NULL, `from_user_id` int UNSIGNED NULL, `to_user_id` int UNSIGNED NULL, `actor_id` int UNSIGNED NOT NULL, `reason` varchar(500) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_doctor_account_link_events_doctor` (`doctor_id`, `id`), PRIMARY KEY (`id`), CONSTRAINT `FK_doctor_account_link_events_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctor_master`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_doctor_account_link_events_from` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_doctor_account_link_events_to` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_doctor_account_link_events_actor` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `doctor_account_link_events`');
    await queryRunner.query('ALTER TABLE `doctor_master` DROP FOREIGN KEY `FK_doctor_master_account_user`');
    await queryRunner.query('DROP INDEX `UQ_doctor_master_account_user` ON `doctor_master`');
    await queryRunner.query('ALTER TABLE `doctor_master` DROP COLUMN `account_user_id`');
  }
}
