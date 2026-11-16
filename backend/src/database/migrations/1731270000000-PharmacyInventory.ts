import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PharmacyInventory1731270000000 implements MigrationInterface {
  name = 'PharmacyInventory1731270000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`inventory_batches\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`medication_id\` int UNSIGNED NOT NULL,
      \`batch_number\` varchar(80) NOT NULL, \`expiry_date\` date NOT NULL,
      \`purchase_price\` decimal(12,2) NOT NULL DEFAULT 0, \`selling_price\` decimal(12,2) NOT NULL DEFAULT 0,
      \`quantity\` int UNSIGNED NOT NULL DEFAULT 0, \`reorder_level\` int UNSIGNED NOT NULL DEFAULT 0,
      \`storage_location\` varchar(120) NULL, \`is_active\` boolean NOT NULL DEFAULT true,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_inventory_batch_medication_batch\` (\`medication_id\`, \`batch_number\`), INDEX \`IDX_inventory_expiry\` (\`expiry_date\`),
      CONSTRAINT \`FK_inventory_medication\` FOREIGN KEY (\`medication_id\`) REFERENCES \`medications\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`stock_transactions\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`batch_id\` int UNSIGNED NOT NULL, \`type\` varchar(30) NOT NULL,
      \`quantity\` int NOT NULL, \`patient_id\` int UNSIGNED NULL, \`reference\` varchar(160) NULL, \`notes\` text NULL,
      \`created_by_id\` int UNSIGNED NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`),
      INDEX \`IDX_stock_transactions_batch\` (\`batch_id\`), INDEX \`IDX_stock_transactions_patient\` (\`patient_id\`),
      CONSTRAINT \`FK_stock_transaction_batch\` FOREIGN KEY (\`batch_id\`) REFERENCES \`inventory_batches\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`FK_stock_transaction_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`FK_stock_transaction_user\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `stock_transactions`');
    await queryRunner.query('DROP TABLE IF EXISTS `inventory_batches`');
  }
}
