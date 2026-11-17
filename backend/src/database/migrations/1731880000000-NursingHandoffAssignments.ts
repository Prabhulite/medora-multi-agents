import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffAssignments1731880000000 implements MigrationInterface {
  name = 'NursingHandoffAssignments1731880000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`nursing_handoff_assignments\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
      \`handoff_id\` int UNSIGNED NOT NULL,
      \`from_recipient_id\` int UNSIGNED NULL,
      \`to_recipient_id\` int UNSIGNED NULL,
      \`reason\` varchar(500) NOT NULL,
      \`changed_by_id\` int UNSIGNED NULL,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_nursing_handoff_assignments_handoff\` (\`handoff_id\`, \`id\`),
      CONSTRAINT \`FK_handoff_assignment_handoff\` FOREIGN KEY (\`handoff_id\`) REFERENCES \`nursing_handoffs\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_handoff_assignment_from\` FOREIGN KEY (\`from_recipient_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
      CONSTRAINT \`FK_handoff_assignment_to\` FOREIGN KEY (\`to_recipient_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
      CONSTRAINT \`FK_handoff_assignment_actor\` FOREIGN KEY (\`changed_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `nursing_handoff_assignments`'); }
}
