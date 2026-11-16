import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PharmacyProcurement1731280000000 implements MigrationInterface {
  name = 'PharmacyProcurement1731280000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`suppliers\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`code\` varchar(40) NOT NULL, \`name\` varchar(180) NOT NULL,
      \`contact_person\` varchar(160) NULL, \`phone\` varchar(40) NULL, \`email\` varchar(160) NULL, \`address\` text NULL,
      \`is_active\` boolean NOT NULL DEFAULT true, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_suppliers_code\` (\`code\`)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`purchase_orders\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`order_number\` varchar(40) NOT NULL, \`supplier_id\` int UNSIGNED NOT NULL,
      \`status\` varchar(30) NOT NULL DEFAULT 'draft', \`order_date\` date NOT NULL, \`expected_date\` date NULL,
      \`total\` decimal(12,2) NOT NULL DEFAULT 0, \`notes\` text NULL, \`created_by_id\` int UNSIGNED NULL,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_purchase_orders_number\` (\`order_number\`), INDEX \`IDX_purchase_orders_supplier\` (\`supplier_id\`),
      CONSTRAINT \`FK_purchase_order_supplier\` FOREIGN KEY (\`supplier_id\`) REFERENCES \`suppliers\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`FK_purchase_order_user\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`purchase_order_items\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`purchase_order_id\` int UNSIGNED NOT NULL, \`medication_id\` int UNSIGNED NOT NULL,
      \`quantity\` int UNSIGNED NOT NULL, \`unit_price\` decimal(12,2) NOT NULL, \`total\` decimal(12,2) NOT NULL, \`received_quantity\` int UNSIGNED NOT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`), INDEX \`IDX_purchase_order_items_order\` (\`purchase_order_id\`),
      CONSTRAINT \`FK_purchase_order_item_order\` FOREIGN KEY (\`purchase_order_id\`) REFERENCES \`purchase_orders\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`FK_purchase_order_item_medication\` FOREIGN KEY (\`medication_id\`) REFERENCES \`medications\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) ENGINE=InnoDB`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `purchase_order_items`');
    await queryRunner.query('DROP TABLE IF EXISTS `purchase_orders`');
    await queryRunner.query('DROP TABLE IF EXISTS `suppliers`');
  }
}
