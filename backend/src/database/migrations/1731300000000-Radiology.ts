import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Radiology1731300000000 implements MigrationInterface {
  name = 'Radiology1731300000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`radiology_modalities\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`modality_code\` varchar(40) NOT NULL, \`modality_name\` varchar(180) NOT NULL,
      \`category\` varchar(80) NULL, \`turnaround_hours\` int UNSIGNED NOT NULL DEFAULT 24, \`price\` decimal(12,2) NOT NULL DEFAULT 0,
      \`is_active\` boolean NOT NULL DEFAULT true, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_radiology_modalities_code\` (\`modality_code\`)
    ) ENGINE=InnoDB`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`radiology_orders\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`order_number\` varchar(40) NOT NULL, \`patient_id\` int UNSIGNED NOT NULL, \`modality_id\` int UNSIGNED NOT NULL, \`doctor_id\` int UNSIGNED NULL,
      \`status\` varchar(30) NOT NULL DEFAULT 'ordered', \`priority\` varchar(30) NOT NULL DEFAULT 'routine', \`clinical_notes\` text NULL,
      \`ordered_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`performed_at\` timestamp(6) NULL, \`reported_at\` timestamp(6) NULL,
      \`report_text\` text NULL, \`impression\` text NULL, \`created_by_id\` int UNSIGNED NULL, \`reported_by_id\` int UNSIGNED NULL,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_radiology_orders_number\` (\`order_number\`), INDEX \`IDX_radiology_orders_patient\` (\`patient_id\`), INDEX \`IDX_radiology_orders_status\` (\`status\`),
      CONSTRAINT \`FK_radiology_order_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT \`FK_radiology_order_modality\` FOREIGN KEY (\`modality_id\`) REFERENCES \`radiology_modalities\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`FK_radiology_order_doctor\` FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`FK_radiology_order_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT \`FK_radiology_order_reported_by\` FOREIGN KEY (\`reported_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
    ) ENGINE=InnoDB`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS `radiology_orders`'); await queryRunner.query('DROP TABLE IF EXISTS `radiology_modalities`'); }
}
