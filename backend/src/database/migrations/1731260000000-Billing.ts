import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Billing1731260000000 implements MigrationInterface {
  name = 'Billing1731260000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`invoices\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`invoice_number\` varchar(40) NOT NULL, \`patient_id\` int UNSIGNED NOT NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'open', \`subtotal\` decimal(12,2) NOT NULL DEFAULT 0, \`discount\` decimal(12,2) NOT NULL DEFAULT 0,
        \`tax\` decimal(12,2) NOT NULL DEFAULT 0, \`total\` decimal(12,2) NOT NULL DEFAULT 0, \`paid_amount\` decimal(12,2) NOT NULL DEFAULT 0,
        \`balance_amount\` decimal(12,2) NOT NULL DEFAULT 0, \`created_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_invoices_number\` (\`invoice_number\`), INDEX \`IDX_invoices_patient\` (\`patient_id\`), INDEX \`IDX_invoices_status\` (\`status\`), PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_invoices_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_invoices_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`invoice_items\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`invoice_id\` int UNSIGNED NOT NULL, \`description\` varchar(255) NOT NULL,
        \`quantity\` decimal(12,2) NOT NULL DEFAULT 1, \`unit_price\` decimal(12,2) NOT NULL, \`total\` decimal(12,2) NOT NULL,
        PRIMARY KEY (\`id\`), INDEX \`IDX_invoice_items_invoice\` (\`invoice_id\`),
        CONSTRAINT \`FK_invoice_items_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`payments\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`invoice_id\` int UNSIGNED NOT NULL, \`amount\` decimal(12,2) NOT NULL,
        \`method\` varchar(30) NOT NULL DEFAULT 'cash', \`reference_number\` varchar(120) NULL, \`paid_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`created_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_payments_invoice\` (\`invoice_id\`),
        CONSTRAINT \`FK_payments_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_payments_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `payments`'); await queryRunner.query('DROP TABLE IF EXISTS `invoice_items`'); await queryRunner.query('DROP TABLE IF EXISTS `invoices`');
  }
}
