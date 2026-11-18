import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegistrationSourceEvents1732800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`registration_source_events\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
      \`source_id\` int UNSIGNED NOT NULL,
      \`action\` varchar(20) NOT NULL,
      \`before_name\` varchar(120) NULL,
      \`after_name\` varchar(120) NOT NULL,
      \`before_active\` boolean NULL,
      \`after_active\` boolean NOT NULL,
      \`actor_id\` int UNSIGNED NULL,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_registration_source_events_source_time\` (\`source_id\`, \`created_at\`, \`id\`),
      CONSTRAINT \`FK_registration_source_events_source\` FOREIGN KEY (\`source_id\`) REFERENCES \`registration_sources\`(\`id\`) ON DELETE RESTRICT,
      CONSTRAINT \`FK_registration_source_events_actor\` FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `registration_source_events`');
  }
}
