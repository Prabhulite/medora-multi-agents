import type { MigrationInterface, QueryRunner } from 'typeorm';
export class NursingObservations1731330000000 implements MigrationInterface {
  name = 'NursingObservations1731330000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`nursing_observations\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`admission_id\` int UNSIGNED NOT NULL, \`observed_at\` timestamp(6) NOT NULL, \`temperature_c\` decimal(4,1) NULL, \`pulse_bpm\` smallint UNSIGNED NULL, \`systolic_bp\` smallint UNSIGNED NULL, \`diastolic_bp\` smallint UNSIGNED NULL, \`spo2_percent\` tinyint UNSIGNED NULL, \`notes\` text NULL, \`recorded_by_id\` int UNSIGNED NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_nursing_admission_time\` (\`admission_id\`, \`observed_at\`), CONSTRAINT \`FK_nursing_admission\` FOREIGN KEY (\`admission_id\`) REFERENCES \`admissions\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT \`FK_nursing_user\` FOREIGN KEY (\`recorded_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `nursing_observations`'); }
}
