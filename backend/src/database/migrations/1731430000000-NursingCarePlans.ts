import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingCarePlans1731430000000 implements MigrationInterface {
  name = 'NursingCarePlans1731430000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`nursing_care_plans\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`admission_id\` int UNSIGNED NOT NULL, \`problem\` varchar(500) NOT NULL, \`goal\` varchar(1000) NOT NULL, \`interventions\` text NOT NULL, \`review_at\` timestamp(6) NULL, \`status\` varchar(20) NOT NULL DEFAULT 'active', \`review_note\` varchar(2000) NULL, \`closed_at\` timestamp(6) NULL, \`created_by_id\` int UNSIGNED NULL, \`closed_by_id\` int UNSIGNED NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_care_plan_admission_status\` (\`admission_id\`, \`status\`), CONSTRAINT \`FK_care_plan_admission\` FOREIGN KEY (\`admission_id\`) REFERENCES \`admissions\`(\`id\`) ON DELETE CASCADE, CONSTRAINT \`FK_care_plan_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL, CONSTRAINT \`FK_care_plan_closed_by\` FOREIGN KEY (\`closed_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `nursing_care_plans`'); }
}
