import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientConsent1731480000000 implements MigrationInterface {
  name = 'PatientConsent1731480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('patient_consents')) return;

    await queryRunner.query(`
      CREATE TABLE \`patient_consents\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`consent_type\` varchar(40) NOT NULL,
        \`subject\` varchar(255) NOT NULL,
        \`risks_explained\` text NOT NULL,
        \`language\` varchar(80) NOT NULL,
        \`signatory_name\` varchar(160) NOT NULL,
        \`signatory_role\` varchar(40) NOT NULL,
        \`signed_at\` datetime(6) NOT NULL,
        \`file_name\` varchar(255) NOT NULL,
        \`mime_type\` varchar(80) NOT NULL,
        \`file_data\` longtext NOT NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'active',
        \`recorded_by_id\` int UNSIGNED NULL,
        \`revoked_at\` datetime(6) NULL,
        \`revoked_by_id\` int UNSIGNED NULL,
        \`revocation_reason\` varchar(1000) NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_patient_consents_patient\` (\`patient_id\`, \`created_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_consents_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_patient_consents_recorder\` FOREIGN KEY (\`recorded_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_patient_consents_revoker\` FOREIGN KEY (\`revoked_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `patient_consents`');
  }
}
