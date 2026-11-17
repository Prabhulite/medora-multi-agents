import { MigrationInterface, QueryRunner } from 'typeorm';

export class CashierReportIndexes1732400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_payments_paid_at_method` ON `payments` (`paid_at`, `method`)');
    await queryRunner.query('CREATE INDEX `IDX_refunds_refunded_at_method` ON `refunds` (`refunded_at`, `method`)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_refunds_refunded_at_method` ON `refunds`');
    await queryRunner.query('DROP INDEX `IDX_payments_paid_at_method` ON `payments`');
  }
}
