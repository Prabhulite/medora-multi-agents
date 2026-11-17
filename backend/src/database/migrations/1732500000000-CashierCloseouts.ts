import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashierCloseouts1732500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `cashier_closeouts` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `business_date` date NOT NULL, `cashier_id` int UNSIGNED NOT NULL, `cash_received` decimal(14,2) NOT NULL, `cash_refunded` decimal(14,2) NOT NULL, `expected_cash` decimal(14,2) NOT NULL, `counted_cash` decimal(14,2) NOT NULL, `variance` decimal(14,2) NOT NULL, `reason` varchar(500) NULL, `closed_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`), UNIQUE INDEX `uq_cashier_closeout_date` (`cashier_id`, `business_date`), INDEX `IDX_cashier_closeouts_date` (`business_date`), CONSTRAINT `FK_cashier_closeouts_user` FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `cashier_closeouts`');
  }
}
