import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Laboratory1731290000000 implements MigrationInterface {
  name = 'Laboratory1731290000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`laboratory_tests\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`test_code\` varchar(40) NOT NULL, \`test_name\` varchar(180) NOT NULL,
      \`category\` varchar(80) NULL, \`priority\` varchar(40) NOT NULL DEFAULT 'routine', \`turnaround_hours\` int UNSIGNED NOT NULL DEFAULT 24,
      \`price\` decimal(12,2) NOT NULL DEFAULT 0, \`is_active\` boolean NOT NULL DEFAULT true,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_laboratory_tests_code\` (\`test_code\`)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`laboratory_orders\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`order_number\` varchar(40) NOT NULL, \`patient_id\` int UNSIGNED NOT NULL, \`test_id\` int UNSIGNED NOT NULL,
      \`doctor_id\` int UNSIGNED NULL, \`status\` varchar(30) NOT NULL DEFAULT 'ordered', \`ordered_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`collected_at\` timestamp(6) NULL, \`completed_at\` timestamp(6) NULL, \`result_value\` text NULL, \`result_unit\` varchar(60) NULL, \`reference_range\` varchar(120) NULL, \`result_notes\` text NULL,
      \`created_by_id\` int UNSIGNED NULL, \`resulted_by_id\` int UNSIGNED NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_laboratory_orders_number\` (\`order_number\`), INDEX \`IDX_laboratory_orders_patient\` (\`patient_id\`), INDEX \`IDX_laboratory_orders_status\` (\`status\`),
      CONSTRAINT \`FK_laboratory_order_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`FK_laboratory_order_test\` FOREIGN KEY (\`test_id\`) REFERENCES \`laboratory_tests\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`FK_laboratory_order_doctor\` FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`FK_laboratory_order_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`FK_laboratory_order_resulted_by\` FOREIGN KEY (\`resulted_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `laboratory_orders`');
    await queryRunner.query('DROP TABLE IF EXISTS `laboratory_tests`');
  }
}
