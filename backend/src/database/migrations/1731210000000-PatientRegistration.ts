import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientRegistration1731210000000 implements MigrationInterface {
  name = 'PatientRegistration1731210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`number_sequences\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`sequence_key\` varchar(40) NOT NULL,
        \`prefix\` varchar(20) NOT NULL,
        \`year_code\` varchar(4) NOT NULL,
        \`last_number\` int UNSIGNED NOT NULL DEFAULT 0,
        \`pad_length\` tinyint UNSIGNED NOT NULL DEFAULT 6,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_number_sequences_key_year\` (\`sequence_key\`, \`year_code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`registration_sources\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`code\` varchar(80) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_registration_sources_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patients\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`mrd_number\` varchar(40) NOT NULL,
        \`registration_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`title\` varchar(20) NULL,
        \`first_name\` varchar(80) NOT NULL,
        \`middle_name\` varchar(80) NULL,
        \`last_name\` varchar(80) NULL,
        \`gender\` varchar(20) NOT NULL,
        \`date_of_birth\` date NULL,
        \`age_years\` int UNSIGNED NULL,
        \`age_is_approximate\` tinyint NOT NULL DEFAULT 0,
        \`blood_group\` varchar(10) NULL,
        \`marital_status\` varchar(30) NULL,
        \`nationality\` varchar(80) NULL,
        \`religion\` varchar(80) NULL,
        \`photo_data\` longtext NULL,
        \`occupation\` varchar(80) NULL,
        \`patient_category\` varchar(40) NULL,
        \`referred_by\` varchar(120) NULL,
        \`referral_doctor_id\` int UNSIGNED NULL,
        \`preferred_language\` varchar(60) NULL,
        \`special_remarks\` text NULL,
        \`registration_source_id\` int UNSIGNED NULL,
        \`merged_into_patient_id\` int UNSIGNED NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_by_id\` int UNSIGNED NULL,
        \`updated_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_patients_mrd_number\` (\`mrd_number\`),
        INDEX \`IDX_patients_name\` (\`first_name\`, \`last_name\`),
        INDEX \`IDX_patients_dob\` (\`date_of_birth\`),
        INDEX \`IDX_patients_active\` (\`is_active\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patients_referral_doctor\`
          FOREIGN KEY (\`referral_doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_patients_registration_source\`
          FOREIGN KEY (\`registration_source_id\`) REFERENCES \`registration_sources\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_patients_merged_into\`
          FOREIGN KEY (\`merged_into_patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_patients_created_by\`
          FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_patients_updated_by\`
          FOREIGN KEY (\`updated_by_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_contacts\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`mobile_number\` varchar(20) NOT NULL,
        \`alternate_mobile\` varchar(20) NULL,
        \`email\` varchar(160) NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_patient_contacts_patient\` (\`patient_id\`),
        INDEX \`IDX_patient_contacts_mobile\` (\`mobile_number\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_contacts_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_addresses\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`address_line1\` varchar(255) NOT NULL,
        \`address_line2\` varchar(255) NULL,
        \`country\` varchar(80) NOT NULL,
        \`state\` varchar(80) NOT NULL,
        \`district\` varchar(80) NOT NULL,
        \`city\` varchar(80) NOT NULL,
        \`pincode\` varchar(12) NOT NULL,
        \`is_primary\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_patient_addresses_patient\` (\`patient_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_addresses_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_identifications\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`id_proof_type\` varchar(40) NULL,
        \`id_proof_number\` varchar(80) NULL,
        \`id_proof_document_name\` varchar(160) NULL,
        \`id_proof_document_file_name\` varchar(255) NULL,
        \`id_proof_document_mime_type\` varchar(120) NULL,
        \`id_proof_document_data\` longtext NULL,
        \`abha_number\` varchar(40) NULL,
        \`abha_address\` varchar(120) NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_patient_identifications_patient\` (\`patient_id\`),
        INDEX \`IDX_patient_identifications_proof\` (\`id_proof_type\`, \`id_proof_number\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_identifications_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_emergency_contacts\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`contact_person_name\` varchar(120) NULL,
        \`relationship\` varchar(40) NULL,
        \`contact_number\` varchar(20) NULL,
        \`alternate_number\` varchar(20) NULL,
        \`address\` text NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_patient_emergency_contacts_patient\` (\`patient_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_emergency_contacts_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_documents\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`name\` varchar(160) NOT NULL,
        \`file_name\` varchar(255) NOT NULL,
        \`mime_type\` varchar(120) NULL,
        \`file_data\` longtext NOT NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_patient_documents_patient\` (\`patient_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_documents_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_allergies\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`allergen\` varchar(160) NOT NULL,
        \`reaction\` varchar(255) NULL,
        \`severity\` varchar(40) NULL,
        \`notes\` text NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_patient_allergies_patient\` (\`patient_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_allergies_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_medical_history\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`condition_name\` varchar(160) NOT NULL,
        \`notes\` text NULL,
        \`diagnosed_on\` date NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_patient_medical_history_patient\` (\`patient_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_medical_history_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_visits\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`visit_number\` varchar(40) NOT NULL,
        \`op_number\` varchar(40) NULL,
        \`ip_number\` varchar(40) NULL,
        \`visit_type\` varchar(20) NOT NULL DEFAULT 'OP',
        \`visit_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`department_id\` int UNSIGNED NULL,
        \`doctor_id\` int UNSIGNED NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'registered',
        \`notes\` text NULL,
        \`created_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_patient_visits_visit_number\` (\`visit_number\`),
        UNIQUE INDEX \`IDX_patient_visits_op_number\` (\`op_number\`),
        INDEX \`IDX_patient_visits_patient\` (\`patient_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_visits_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_patient_visits_department\`
          FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_patient_visits_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_patient_visits_created_by\`
          FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`patient_audit_logs\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`action\` varchar(40) NOT NULL,
        \`changed_by_id\` int UNSIGNED NULL,
        \`change_summary\` varchar(255) NULL,
        \`before_data\` longtext NULL,
        \`after_data\` longtext NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_patient_audit_logs_patient\` (\`patient_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_audit_logs_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_patient_audit_logs_user\`
          FOREIGN KEY (\`changed_by_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_audit_logs\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_visits\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_medical_history\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_allergies\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_documents\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_emergency_contacts\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_identifications\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_addresses\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patient_contacts\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`patients\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`registration_sources\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`number_sequences\``);
  }
}
