import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Appointments1731220000000 implements MigrationInterface {
  name = 'Appointments1731220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`appointments\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`appointment_number\` varchar(40) NOT NULL,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`doctor_id\` int UNSIGNED NOT NULL,
        \`department_id\` int UNSIGNED NOT NULL,
        \`appointment_date\` date NOT NULL,
        \`appointment_time\` time NOT NULL,
        \`appointment_type\` varchar(40) NOT NULL,
        \`reason\` varchar(255) NULL,
        \`remarks\` text NULL,
        \`status\` varchar(30) NOT NULL DEFAULT 'booked',
        \`visit_id\` int UNSIGNED NULL,
        \`created_by_id\` int UNSIGNED NULL,
        \`updated_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_appointments_number\` (\`appointment_number\`),
        INDEX \`IDX_appointments_patient\` (\`patient_id\`),
        INDEX \`IDX_appointments_doctor_date\` (\`doctor_id\`, \`appointment_date\`),
        INDEX \`IDX_appointments_doctor_slot\` (\`doctor_id\`, \`appointment_date\`, \`appointment_time\`),
        INDEX \`IDX_appointments_status\` (\`status\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_appointments_patient\`
          FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`FK_appointments_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`FK_appointments_department\`
          FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT \`FK_appointments_visit\`
          FOREIGN KEY (\`visit_id\`) REFERENCES \`patient_visits\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_appointments_created_by\`
          FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT \`FK_appointments_updated_by\`
          FOREIGN KEY (\`updated_by_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`appointment_status_history\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`appointment_id\` int UNSIGNED NOT NULL,
        \`from_status\` varchar(30) NULL,
        \`to_status\` varchar(30) NOT NULL,
        \`notes\` varchar(255) NULL,
        \`changed_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_appointment_status_history_appointment\` (\`appointment_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_appointment_status_history_appointment\`
          FOREIGN KEY (\`appointment_id\`) REFERENCES \`appointments\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_appointment_status_history_user\`
          FOREIGN KEY (\`changed_by_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`doctor_time_slots\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`doctor_id\` int UNSIGNED NOT NULL,
        \`slot_date\` date NOT NULL,
        \`slot_time\` time NOT NULL,
        \`is_available\` tinyint NOT NULL DEFAULT 1,
        \`appointment_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_doctor_time_slots_doctor_date_time\` (\`doctor_id\`, \`slot_date\`, \`slot_time\`),
        INDEX \`IDX_doctor_time_slots_date\` (\`slot_date\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_doctor_time_slots_doctor\`
          FOREIGN KEY (\`doctor_id\`) REFERENCES \`doctor_master\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_doctor_time_slots_appointment\`
          FOREIGN KEY (\`appointment_id\`) REFERENCES \`appointments\`(\`id\`)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`doctor_time_slots\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`appointment_status_history\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`appointments\``);
  }
}
