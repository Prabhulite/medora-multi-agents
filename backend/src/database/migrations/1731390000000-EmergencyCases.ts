import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EmergencyCases1731390000000 implements MigrationInterface {
  name = 'EmergencyCases1731390000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`emergency_cases\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`case_number\` varchar(40) NOT NULL, \`patient_id\` int UNSIGNED NOT NULL, \`triage_category\` varchar(10) NOT NULL, \`chief_complaint\` varchar(1000) NOT NULL, \`pulse_bpm\` smallint UNSIGNED NULL, \`systolic_bp\` smallint UNSIGNED NULL, \`diastolic_bp\` smallint UNSIGNED NULL, \`spo2_percent\` tinyint UNSIGNED NULL, \`status\` varchar(20) NOT NULL DEFAULT 'waiting', \`triaged_at\` timestamp(6) NOT NULL, \`triaged_by_id\` int UNSIGNED NULL, \`disposition_at\` timestamp(6) NULL, \`disposition_note\` varchar(2000) NULL, \`updated_by_id\` int UNSIGNED NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), UNIQUE INDEX \`IDX_emergency_case_number\` (\`case_number\`), INDEX \`IDX_emergency_status_triage\` (\`status\`, \`triage_category\`, \`triaged_at\`), INDEX \`IDX_emergency_patient\` (\`patient_id\`), CONSTRAINT \`FK_emergency_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE CASCADE, CONSTRAINT \`FK_emergency_triaged_by\` FOREIGN KEY (\`triaged_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL, CONSTRAINT \`FK_emergency_updated_by\` FOREIGN KEY (\`updated_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `emergency_cases`'); }
}
