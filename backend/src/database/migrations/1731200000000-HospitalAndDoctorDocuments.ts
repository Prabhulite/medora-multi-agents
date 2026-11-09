import type { MigrationInterface, QueryRunner } from 'typeorm';

export class HospitalAndDoctorDocuments1731200000000 implements MigrationInterface {
  name = 'HospitalAndDoctorDocuments1731200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hospital_documents\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`hospital_profile_id\` int UNSIGNED NOT NULL,
        \`name\` varchar(160) NOT NULL,
        \`file_name\` varchar(255) NOT NULL,
        \`mime_type\` varchar(120) NULL,
        \`file_data\` longtext NOT NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_hospital_documents_profile\` (\`hospital_profile_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_hospital_documents_profile\`
          FOREIGN KEY (\`hospital_profile_id\`) REFERENCES \`hospital_profiles\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`doctor_documents\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`doctor_id\` int UNSIGNED NOT NULL,
        \`name\` varchar(160) NOT NULL,
        \`file_name\` varchar(255) NOT NULL,
        \`mime_type\` varchar(120) NULL,
        \`file_data\` longtext NOT NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_doctor_documents_doctor\` (\`doctor_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_doctor_documents_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `doctor_documents`');
    await queryRunner.query('DROP TABLE IF EXISTS `hospital_documents`');
  }
}
