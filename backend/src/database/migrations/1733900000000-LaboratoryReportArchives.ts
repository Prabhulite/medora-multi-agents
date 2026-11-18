import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryReportArchives1733900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `laboratory_report_archives` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `order_id` int UNSIGNED NOT NULL, `snapshot_json` json NOT NULL, `checksum` char(64) NOT NULL, `released_at` timestamp(6) NOT NULL, `archived_by_id` int UNSIGNED NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_laboratory_report_archives_order` (`order_id`), PRIMARY KEY (`id`), CONSTRAINT `FK_lab_archive_order` FOREIGN KEY (`order_id`) REFERENCES `laboratory_orders` (`id`) ON DELETE RESTRICT, CONSTRAINT `FK_lab_archive_user` FOREIGN KEY (`archived_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `laboratory_report_archives`');
  }
}
