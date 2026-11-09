import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DoctorMasterAndSpecializations1731190000000 implements MigrationInterface {
  name = 'DoctorMasterAndSpecializations1731190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`specializations\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`code\` varchar(80) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_specializations_code\` (\`code\`),
        UNIQUE INDEX \`IDX_specializations_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`doctor_master\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`doctor_code\` varchar(20) NOT NULL,
        \`name\` varchar(160) NOT NULL,
        \`gender\` varchar(20) NULL,
        \`dob\` date NULL,
        \`mobile_number\` varchar(20) NOT NULL,
        \`email\` varchar(160) NULL,
        \`address\` text NULL,
        \`photo_data\` longtext NULL,
        \`qualification\` varchar(160) NOT NULL,
        \`specialization_id\` int UNSIGNED NOT NULL,
        \`department_id\` int UNSIGNED NOT NULL,
        \`medical_registration_number\` varchar(80) NOT NULL,
        \`experience_years\` int UNSIGNED NULL,
        \`designation\` varchar(40) NULL,
        \`review_validity_days\` int UNSIGNED NULL,
        \`consultation_duration_minutes\` int UNSIGNED NULL,
        \`walk_in_allowed\` tinyint NOT NULL DEFAULT 1,
        \`appointment_required\` tinyint NOT NULL DEFAULT 0,
        \`consultation_room\` varchar(80) NULL,
        \`doctor_type\` varchar(20) NULL,
        \`joining_date\` date NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_doctor_master_code\` (\`doctor_code\`),
        INDEX \`IDX_doctor_master_department\` (\`department_id\`),
        INDEX \`IDX_doctor_master_specialization\` (\`specialization_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_doctor_master_department\`
          FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`FK_doctor_master_specialization\`
          FOREIGN KEY (\`specialization_id\`) REFERENCES \`specializations\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`doctor_consultation_fee\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`doctor_id\` int UNSIGNED NOT NULL,
        \`new_consultation_fee\` decimal(10,2) NULL,
        \`follow_up_consultation_fee\` decimal(10,2) NULL,
        \`emergency_consultation_fee\` decimal(10,2) NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_doctor_consultation_fee_doctor\` (\`doctor_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_doctor_consultation_fee_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`doctor_schedule\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`doctor_id\` int UNSIGNED NOT NULL,
        \`day_of_week\` tinyint UNSIGNED NOT NULL,
        \`is_available\` tinyint NOT NULL DEFAULT 1,
        \`morning_start\` time NULL,
        \`morning_end\` time NULL,
        \`evening_start\` time NULL,
        \`evening_end\` time NULL,
        \`break_start\` time NULL,
        \`break_end\` time NULL,
        \`max_patients_per_session\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_doctor_schedule_doctor_day\` (\`doctor_id\`, \`day_of_week\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_doctor_schedule_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`doctor_leave\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`doctor_id\` int UNSIGNED NOT NULL,
        \`leave_from\` date NOT NULL,
        \`leave_to\` date NOT NULL,
        \`reason\` varchar(255) NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'scheduled',
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_doctor_leave_doctor\` (\`doctor_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_doctor_leave_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `doctor_leave`');
    await queryRunner.query('DROP TABLE IF EXISTS `doctor_schedule`');
    await queryRunner.query('DROP TABLE IF EXISTS `doctor_consultation_fee`');
    await queryRunner.query('DROP TABLE IF EXISTS `doctor_master`');
    await queryRunner.query('DROP TABLE IF EXISTS `specializations`');
  }
}
