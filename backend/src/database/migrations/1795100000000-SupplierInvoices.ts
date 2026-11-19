import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SupplierInvoices1795100000000 implements MigrationInterface {
  name = 'SupplierInvoices1795100000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`supplier_invoices\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`supplier_id\` int UNSIGNED NOT NULL, \`purchase_order_id\` int UNSIGNED NULL, \`invoice_number\` varchar(80) NOT NULL, \`invoice_date\` date NOT NULL, \`due_date\` date NULL, \`amount\` decimal(12,2) NOT NULL, \`notes\` text NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_supplier_invoice_number\` (\`supplier_id\`, \`invoice_number\`), INDEX \`IDX_supplier_invoice_order\` (\`purchase_order_id\`), CONSTRAINT \`FK_supplier_invoice_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE RESTRICT, CONSTRAINT \`FK_supplier_invoice_order\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\`(\`id\`) ON DELETE RESTRICT) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE \`supplier_invoice_payments\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`supplier_invoice_id\` int UNSIGNED NOT NULL, \`amount\` decimal(12,2) NOT NULL, \`paid_on\` date NOT NULL, \`method\` varchar(30) NOT NULL, \`reference\` varchar(120) NULL, \`created_by_id\` int UNSIGNED NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_supplier_payment_invoice\` (\`supplier_invoice_id\`), CONSTRAINT \`FK_supplier_payment_invoice\` FOREIGN KEY (\`supplier_invoice_id\`) REFERENCES \`supplier_invoices\`(\`id\`) ON DELETE RESTRICT, CONSTRAINT \`FK_supplier_payment_user\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `supplier_invoice_payments`');
    await queryRunner.query('DROP TABLE `supplier_invoices`');
  }
}
