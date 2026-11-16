import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InpatientManagement1731250000000 implements MigrationInterface {
  name = 'InpatientManagement1731250000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`wards\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`code\` varchar(40) NOT NULL, \`name\` varchar(120) NOT NULL,
        \`ward_type\` varchar(40) NOT NULL DEFAULT 'general', \`floor\` int UNSIGNED NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_wards_code\` (\`code\`), PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`beds\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`ward_id\` int UNSIGNED NOT NULL, \`number\` varchar(40) NOT NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'available', \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_beds_ward_number\` (\`ward_id\`, \`number\`), INDEX \`IDX_beds_status\` (\`status\`), PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_beds_ward\` FOREIGN KEY (\`ward_id\`) REFERENCES \`wards\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`admissions\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`admission_number\` varchar(40) NOT NULL, \`patient_id\` int UNSIGNED NOT NULL,
        \`bed_id\` int UNSIGNED NOT NULL, \`doctor_id\` int UNSIGNED NULL, \`department_id\` int UNSIGNED NULL,
        \`admitted_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`discharged_at\` timestamp(6) NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'admitted', \`reason\` varchar(255) NULL, \`notes\` text NULL, \`created_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_admissions_number\` (\`admission_number\`), INDEX \`IDX_admissions_patient\` (\`patient_id\`), INDEX \`IDX_admissions_status\` (\`status\`), PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_admissions_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_admissions_bed\` FOREIGN KEY (\`bed_id\`) REFERENCES \`beds\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`FK_admissions_doctor\` FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_admissions_department\` FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_admissions_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `admissions`');
    await queryRunner.query('DROP TABLE IF EXISTS `beds`');
    await queryRunner.query('DROP TABLE IF EXISTS `wards`');
  }
}
