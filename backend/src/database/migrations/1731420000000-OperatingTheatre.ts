import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OperatingTheatre1731420000000 implements MigrationInterface {
  name = 'OperatingTheatre1731420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('operating_rooms'))) {
      await queryRunner.query(`
        CREATE TABLE \`operating_rooms\` (
          \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
          \`code\` varchar(40) NOT NULL,
          \`name\` varchar(120) NOT NULL,
          \`is_active\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`IDX_operating_room_code\` (\`code\`)
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasTable('surgery_cases'))) {
      await queryRunner.query(`
        CREATE TABLE \`surgery_cases\` (
          \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
          \`case_number\` varchar(40) NOT NULL,
          \`patient_id\` int UNSIGNED NOT NULL,
          \`surgeon_id\` int UNSIGNED NOT NULL,
          \`room_id\` int UNSIGNED NOT NULL,
          \`procedure\` varchar(255) NOT NULL,
          \`planned_start\` datetime(6) NOT NULL,
          \`planned_end\` datetime(6) NOT NULL,
          \`status\` varchar(20) NOT NULL DEFAULT 'scheduled',
          \`started_at\` datetime(6) NULL,
          \`completed_at\` datetime(6) NULL,
          \`outcome_note\` text NULL,
          \`cancel_reason\` varchar(1000) NULL,
          \`created_by_id\` int UNSIGNED NULL,
          \`updated_by_id\` int UNSIGNED NULL,
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`IDX_surgery_case_number\` (\`case_number\`),
          INDEX \`IDX_surgery_room_schedule\` (\`room_id\`, \`planned_start\`, \`planned_end\`),
          INDEX \`IDX_surgery_surgeon_schedule\` (\`surgeon_id\`, \`planned_start\`, \`planned_end\`),
          CONSTRAINT \`FK_surgery_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_surgery_surgeon\` FOREIGN KEY (\`surgeon_id\`) REFERENCES \`doctor_master\`(\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`FK_surgery_room\` FOREIGN KEY (\`room_id\`) REFERENCES \`operating_rooms\`(\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`FK_surgery_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`FK_surgery_updated_by\` FOREIGN KEY (\`updated_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `surgery_cases`');
    await queryRunner.query('DROP TABLE IF EXISTS `operating_rooms`');
  }
}
