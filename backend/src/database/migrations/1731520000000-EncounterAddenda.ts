import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EncounterAddenda1731520000000 implements MigrationInterface {
  name = 'EncounterAddenda1731520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('clinical_encounter_addenda')) return;

    await queryRunner.query(`
      CREATE TABLE \`clinical_encounter_addenda\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`encounter_id\` int UNSIGNED NOT NULL,
        \`reason\` varchar(255) NOT NULL,
        \`addendum\` text NOT NULL,
        \`created_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_encounter_addenda_encounter_time\` (\`encounter_id\`, \`created_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_encounter_addenda_encounter\` FOREIGN KEY (\`encounter_id\`) REFERENCES \`clinical_encounters\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_encounter_addenda_author\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `clinical_encounter_addenda`');
  }
}
