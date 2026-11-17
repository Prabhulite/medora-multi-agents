import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryCommunications1731680000000 implements MigrationInterface {
  name = 'LaboratoryCommunications1731680000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `laboratory_communications` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `order_id` int UNSIGNED NOT NULL, `outcome` varchar(20) NOT NULL, `method` varchar(30) NOT NULL, `recipient_name` varchar(160) NOT NULL, `result_summary` varchar(1000) NOT NULL, `note` varchar(1000) NULL, `occurred_at` datetime(6) NOT NULL, `recorded_by_id` int UNSIGNED NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_laboratory_communication_order_id` (`order_id`, `id`), PRIMARY KEY (`id`), CONSTRAINT `FK_laboratory_communication_order` FOREIGN KEY (`order_id`) REFERENCES `laboratory_orders`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_laboratory_communication_recorder` FOREIGN KEY (`recorded_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `laboratory_communications`');
  }
}
