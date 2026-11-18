import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceMaster1734300000000 implements MigrationInterface {
  name = 'ServiceMaster1734300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('service_categories'))) {
      await queryRunner.query(`
        CREATE TABLE \`service_categories\` (
          \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
          \`code\` varchar(40) NOT NULL,
          \`name\` varchar(120) NOT NULL,
          \`description\` varchar(255) NULL,
          \`sort_order\` int UNSIGNED NOT NULL DEFAULT 0,
          \`is_active\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`UQ_service_categories_code\` (\`code\`),
          UNIQUE INDEX \`UQ_service_categories_name\` (\`name\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasTable('service_master'))) {
      await queryRunner.query(`
        CREATE TABLE \`service_master\` (
          \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
          \`service_code\` varchar(40) NOT NULL,
          \`service_name\` varchar(160) NOT NULL,
          \`category_id\` int UNSIGNED NOT NULL,
          \`department_id\` int UNSIGNED NOT NULL,
          \`service_type\` varchar(10) NOT NULL,
          \`default_price\` decimal(12,2) NOT NULL,
          \`tax_percent\` decimal(5,2) NULL,
          \`description\` text NULL,
          \`is_active\` tinyint NOT NULL DEFAULT 1,
          \`billing_applicable\` varchar(10) NOT NULL DEFAULT 'Both',
          \`allow_discount\` tinyint NOT NULL DEFAULT 1,
          \`allow_quantity\` tinyint NOT NULL DEFAULT 1,
          \`default_quantity\` decimal(10,2) NOT NULL DEFAULT 1.00,
          \`effective_from\` date NOT NULL,
          \`branch_name\` varchar(120) NULL,
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`UQ_service_master_code\` (\`service_code\`),
          INDEX \`IDX_service_master_category\` (\`category_id\`),
          INDEX \`IDX_service_master_department\` (\`department_id\`),
          INDEX \`IDX_service_master_active\` (\`is_active\`),
          CONSTRAINT \`FK_service_master_category\` FOREIGN KEY (\`category_id\`) REFERENCES \`service_categories\`(\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`FK_service_master_department\` FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE RESTRICT,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `service_master`');
    await queryRunner.query('DROP TABLE IF EXISTS `service_categories`');
  }
}
