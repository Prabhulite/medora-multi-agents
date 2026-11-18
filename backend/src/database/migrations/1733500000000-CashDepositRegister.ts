import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CashDepositRegister1733500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `cash_deposits` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `closeout_id` int UNSIGNED NOT NULL, `deposit_date` date NOT NULL, `amount` decimal(14,2) NOT NULL, `bank_reference` varchar(120) NOT NULL, `note` varchar(500) NULL, `recorded_by_id` int UNSIGNED NOT NULL, `recorded_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`), UNIQUE INDEX `uq_cash_deposit_reference` (`closeout_id`, `bank_reference`), INDEX `IDX_cash_deposits_date` (`deposit_date`), CONSTRAINT `FK_cash_deposits_closeout` FOREIGN KEY (`closeout_id`) REFERENCES `cashier_closeouts`(`id`) ON DELETE RESTRICT, CONSTRAINT `FK_cash_deposits_user` FOREIGN KEY (`recorded_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `cash_deposits`');
  }
}
