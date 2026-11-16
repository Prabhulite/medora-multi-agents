import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Refunds1731370000000 implements MigrationInterface {
  name = 'Refunds1731370000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`refunds\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`invoice_id\` int UNSIGNED NOT NULL, \`payment_id\` int UNSIGNED NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`method\` varchar(30) NOT NULL, \`reference_number\` varchar(120) NULL, \`reason\` varchar(500) NOT NULL, \`created_by_id\` int UNSIGNED NULL, \`refunded_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_refunds_invoice\` (\`invoice_id\`), INDEX \`IDX_refunds_payment\` (\`payment_id\`), CONSTRAINT \`FK_refunds_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE, CONSTRAINT \`FK_refunds_payment\` FOREIGN KEY (\`payment_id\`) REFERENCES \`payments\`(\`id\`) ON DELETE RESTRICT, CONSTRAINT \`FK_refunds_user\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `refunds`'); }
}
