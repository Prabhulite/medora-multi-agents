import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryResultAddenda1731660000000 implements MigrationInterface {
  name = 'LaboratoryResultAddenda1731660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `laboratory_result_addenda` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `order_id` int UNSIGNED NOT NULL, `reason` varchar(500) NOT NULL, `addendum` text NOT NULL, `created_by_id` int UNSIGNED NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_laboratory_addenda_order_id` (`order_id`, `id`), PRIMARY KEY (`id`), CONSTRAINT `FK_laboratory_addenda_order` FOREIGN KEY (`order_id`) REFERENCES `laboratory_orders`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_laboratory_addenda_author` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL) ENGINE=InnoDB');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `laboratory_result_addenda`');
  }
}
