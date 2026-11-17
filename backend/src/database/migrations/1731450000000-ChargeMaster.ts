import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ChargeMaster1731450000000 implements MigrationInterface {
  name = 'ChargeMaster1731450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('charge_master'))) {
      await queryRunner.query(`
        CREATE TABLE \`charge_master\` (
          \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
          \`code\` varchar(40) NOT NULL,
          \`name\` varchar(160) NOT NULL,
          \`category\` varchar(60) NOT NULL,
          \`unit_price\` decimal(12,2) NOT NULL,
          \`is_active\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`IDX_charge_code\` (\`code\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasColumn('invoice_items', 'charge_id'))) {
      await queryRunner.query(
        'ALTER TABLE `invoice_items` ADD `charge_id` int UNSIGNED NULL',
      );
    }

    const invoiceItems = await queryRunner.getTable('invoice_items');
    if (
      invoiceItems &&
      !invoiceItems.foreignKeys.some((fk) => fk.name === 'FK_invoice_item_charge')
    ) {
      await queryRunner.query(
        'ALTER TABLE `invoice_items` ADD CONSTRAINT `FK_invoice_item_charge` FOREIGN KEY (`charge_id`) REFERENCES `charge_master`(`id`) ON DELETE SET NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const invoiceItems = await queryRunner.getTable('invoice_items');
    if (invoiceItems?.foreignKeys.some((fk) => fk.name === 'FK_invoice_item_charge')) {
      await queryRunner.query(
        'ALTER TABLE `invoice_items` DROP FOREIGN KEY `FK_invoice_item_charge`',
      );
    }
    if (await queryRunner.hasColumn('invoice_items', 'charge_id')) {
      await queryRunner.query('ALTER TABLE `invoice_items` DROP COLUMN `charge_id`');
    }
    await queryRunner.query('DROP TABLE IF EXISTS `charge_master`');
  }
}
