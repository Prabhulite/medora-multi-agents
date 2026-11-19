import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StaffChat1795000001000 implements MigrationInterface {
  name = 'StaffChat1795000001000';
  async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE TABLE `staff_chat_messages` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `sender_id` int UNSIGNED NOT NULL, `recipient_id` int UNSIGNED NOT NULL, `body` text NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_staff_chat_sender_recipient_id` (`sender_id`, `recipient_id`, `id`), INDEX `IDX_staff_chat_recipient_sender_id` (`recipient_id`, `sender_id`, `id`), PRIMARY KEY (`id`), CONSTRAINT `FK_staff_chat_sender` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_staff_chat_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
  }
  async down(q: QueryRunner): Promise<void> { await q.query('DROP TABLE `staff_chat_messages`'); }
}
