import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffs1731850000000 implements MigrationInterface {
  name = 'NursingHandoffs1731850000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`nursing_handoffs\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
      \`admission_id\` int UNSIGNED NOT NULL,
      \`condition_summary\` text NOT NULL,
      \`pending_tasks\` text NOT NULL,
      \`safety_concerns\` text NULL,
      \`outgoing_by_id\` int UNSIGNED NOT NULL,
      \`acknowledged_by_id\` int UNSIGNED NULL,
      \`acknowledged_at\` datetime(6) NULL,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_nursing_handoffs_admission\` (\`admission_id\`, \`id\`),
      CONSTRAINT \`FK_nursing_handoff_admission\` FOREIGN KEY (\`admission_id\`) REFERENCES \`admissions\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_nursing_handoff_outgoing\` FOREIGN KEY (\`outgoing_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE RESTRICT,
      CONSTRAINT \`FK_nursing_handoff_acknowledged\` FOREIGN KEY (\`acknowledged_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `nursing_handoffs`'); }
}
