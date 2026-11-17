import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RadiologyScheduling1731620000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `radiology_orders` ADD `scheduled_at` datetime(6) NULL');
    await queryRunner.query('CREATE INDEX `IDX_radiology_orders_scheduled_at` ON `radiology_orders` (`scheduled_at`)');
    await queryRunner.query('CREATE TABLE `radiology_schedule_events` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `order_id` int UNSIGNED NOT NULL, `previous_at` datetime(6) NULL, `scheduled_at` datetime(6) NOT NULL, `reason` varchar(500) NULL, `created_by_id` int UNSIGNED NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_radiology_schedule_events_order_id` (`order_id`, `id`), PRIMARY KEY (`id`), CONSTRAINT `FK_radiology_schedule_events_order` FOREIGN KEY (`order_id`) REFERENCES `radiology_orders`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_radiology_schedule_events_user` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `radiology_schedule_events`');
    await queryRunner.query('DROP INDEX `IDX_radiology_orders_scheduled_at` ON `radiology_orders`');
    await queryRunner.query('ALTER TABLE `radiology_orders` DROP COLUMN `scheduled_at`');
  }
}
