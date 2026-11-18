import { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffEscalations1733000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`nursing_handoff_escalations\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
      \`handoff_id\` int UNSIGNED NOT NULL,
      \`recipient_id\` int UNSIGNED NULL,
      \`raised_by_id\` int UNSIGNED NULL,
      \`reason\` varchar(500) NOT NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_nursing_handoff_escalations_handoff\` (\`handoff_id\`, \`id\`),
      UNIQUE INDEX \`UQ_nursing_handoff_escalation_target\` (\`handoff_id\`, \`recipient_id\`),
      CONSTRAINT \`FK_nursing_handoff_escalations_handoff\` FOREIGN KEY (\`handoff_id\`) REFERENCES \`nursing_handoffs\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_nursing_handoff_escalations_recipient\` FOREIGN KEY (\`recipient_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
      CONSTRAINT \`FK_nursing_handoff_escalations_actor\` FOREIGN KEY (\`raised_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `nursing_handoff_escalations`');
  }
}
