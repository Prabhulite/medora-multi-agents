import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CashDepositSettlements1733700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `cash_deposit_settlements` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `deposit_id` int UNSIGNED NOT NULL, `statement_date` date NOT NULL, `statement_reference` varchar(120) NOT NULL, `matched_by_id` int UNSIGNED NOT NULL, `matched_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`), UNIQUE INDEX `uq_cash_deposit_settlement_deposit` (`deposit_id`), UNIQUE INDEX `uq_cash_deposit_settlement_reference` (`statement_reference`), CONSTRAINT `FK_cash_deposit_settlement_deposit` FOREIGN KEY (`deposit_id`) REFERENCES `cash_deposits`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_cash_deposit_settlement_user` FOREIGN KEY (`matched_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `cash_deposit_settlements`'); }
}
