import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MedicationsAndPrescriptions1731240000000 implements MigrationInterface {
  name = 'MedicationsAndPrescriptions1731240000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`medications\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`medicine_code\` varchar(40) NOT NULL,
        \`generic_name\` varchar(160) NOT NULL,
        \`brand_name\` varchar(160) NOT NULL,
        \`form\` varchar(40) NOT NULL,
        \`strength\` varchar(80) NULL,
        \`unit\` varchar(20) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_medications_code\` (\`medicine_code\`), PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`prescriptions\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`encounter_id\` int UNSIGNED NULL,
        \`medication_id\` int UNSIGNED NULL,
        \`medicine_name\` varchar(160) NOT NULL,
        \`dosage\` varchar(80) NULL,
        \`frequency\` varchar(80) NULL,
        \`duration_days\` int UNSIGNED NULL,
        \`route\` varchar(40) NOT NULL DEFAULT 'oral',
        \`instructions\` text NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'active',
        \`created_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_prescriptions_patient\` (\`patient_id\`), INDEX \`IDX_prescriptions_encounter\` (\`encounter_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_prescriptions_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_prescriptions_encounter\` FOREIGN KEY (\`encounter_id\`) REFERENCES \`clinical_encounters\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_prescriptions_medication\` FOREIGN KEY (\`medication_id\`) REFERENCES \`medications\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_prescriptions_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `prescriptions`');
    await queryRunner.query('DROP TABLE IF EXISTS `medications`');
  }
}
