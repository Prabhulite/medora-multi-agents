import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserNotifications1731570000000 implements MigrationInterface {
  name = 'UserNotifications1731570000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE TABLE `user_notifications` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `recipient_id` int UNSIGNED NOT NULL, `kind` varchar(40) NOT NULL, `source_id` int UNSIGNED NOT NULL, `title` varchar(160) NOT NULL, `message` varchar(500) NOT NULL, `route` varchar(255) NULL, `read_at` timestamp(6) NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_user_notifications_source` (`recipient_id`, `kind`, `source_id`), INDEX `IDX_user_notifications_recipient` (`recipient_id`, `id`), PRIMARY KEY (`id`), CONSTRAINT `FK_user_notifications_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `user_notifications`');
  }
}
