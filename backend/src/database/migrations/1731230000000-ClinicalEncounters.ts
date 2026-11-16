import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClinicalEncounters1731230000000 implements MigrationInterface {
  name = 'ClinicalEncounters1731230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`clinical_encounters\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`visit_id\` int UNSIGNED NULL,
        \`doctor_id\` int UNSIGNED NULL,
        \`encounter_type\` varchar(30) NOT NULL DEFAULT 'consultation',
        \`status\` varchar(30) NOT NULL DEFAULT 'draft',
        \`complaints\` text NULL,
        \`examination\` text NULL,
        \`assessment\` text NULL,
        \`plan\` text NULL,
        \`diagnosis_code\` varchar(40) NULL,
        \`diagnosis_name\` varchar(160) NULL,
        \`vitals\` json NULL,
        \`created_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_clinical_encounters_patient\` (\`patient_id\`),
        INDEX \`IDX_clinical_encounters_visit\` (\`visit_id\`),
        INDEX \`IDX_clinical_encounters_doctor\` (\`doctor_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_clinical_encounters_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_clinical_encounters_visit\` FOREIGN KEY (\`visit_id\`) REFERENCES \`patient_visits\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_clinical_encounters_doctor\` FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_clinical_encounters_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `clinical_encounters`');
  }
}
