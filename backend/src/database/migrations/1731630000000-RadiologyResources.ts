import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RadiologyResources1731630000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `radiology_resources` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `modality_id` int UNSIGNED NOT NULL, `code` varchar(40) NOT NULL, `name` varchar(160) NOT NULL, `location` varchar(160) NULL, `is_active` boolean NOT NULL DEFAULT true, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`), UNIQUE INDEX `IDX_radiology_resources_code` (`code`), INDEX `IDX_radiology_resources_modality` (`modality_id`), CONSTRAINT `FK_radiology_resources_modality` FOREIGN KEY (`modality_id`) REFERENCES `radiology_modalities`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
    await queryRunner.query('ALTER TABLE `radiology_orders` ADD `resource_id` int UNSIGNED NULL, ADD `scheduled_end_at` datetime(6) NULL, ADD CONSTRAINT `FK_radiology_orders_resource` FOREIGN KEY (`resource_id`) REFERENCES `radiology_resources`(`id`) ON DELETE RESTRICT');
    await queryRunner.query('CREATE INDEX `IDX_radiology_resource_schedule` ON `radiology_orders` (`resource_id`, `scheduled_at`, `scheduled_end_at`)');
    await queryRunner.query('ALTER TABLE `radiology_schedule_events` ADD `previous_end_at` datetime(6) NULL, ADD `scheduled_end_at` datetime(6) NULL, ADD `previous_resource_id` int UNSIGNED NULL, ADD `resource_id` int UNSIGNED NULL, ADD CONSTRAINT `FK_radiology_schedule_previous_resource` FOREIGN KEY (`previous_resource_id`) REFERENCES `radiology_resources`(`id`) ON DELETE RESTRICT, ADD CONSTRAINT `FK_radiology_schedule_resource` FOREIGN KEY (`resource_id`) REFERENCES `radiology_resources`(`id`) ON DELETE RESTRICT');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `radiology_schedule_events` DROP FOREIGN KEY `FK_radiology_schedule_previous_resource`, DROP FOREIGN KEY `FK_radiology_schedule_resource`, DROP COLUMN `previous_end_at`, DROP COLUMN `scheduled_end_at`, DROP COLUMN `previous_resource_id`, DROP COLUMN `resource_id`');
    await queryRunner.query('DROP INDEX `IDX_radiology_resource_schedule` ON `radiology_orders`');
    await queryRunner.query('ALTER TABLE `radiology_orders` DROP FOREIGN KEY `FK_radiology_orders_resource`, DROP COLUMN `resource_id`, DROP COLUMN `scheduled_end_at`');
    await queryRunner.query('DROP TABLE `radiology_resources`');
  }
}
