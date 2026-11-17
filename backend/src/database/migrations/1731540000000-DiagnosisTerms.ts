import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DiagnosisTerms1731540000000 implements MigrationInterface {
  name = 'DiagnosisTerms1731540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('diagnosis_terms'))) {
      await queryRunner.query(`
        CREATE TABLE \`diagnosis_terms\` (
          \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
          \`system\` varchar(20) NOT NULL,
          \`code\` varchar(40) NOT NULL,
          \`name\` varchar(160) NOT NULL,
          \`version\` varchar(40) NOT NULL DEFAULT '',
          \`is_active\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`UQ_diagnosis_terms_system_code_version\` (\`system\`, \`code\`, \`version\`),
          INDEX \`IDX_diagnosis_terms_name\` (\`name\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasColumn('clinical_encounters', 'diagnosis_system'))) {
      await queryRunner.query(
        'ALTER TABLE `clinical_encounters` ADD `diagnosis_system` varchar(20) NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('clinical_encounters', 'diagnosis_system')) {
      await queryRunner.query(
        'ALTER TABLE `clinical_encounters` DROP COLUMN `diagnosis_system`',
      );
    }
    await queryRunner.query('DROP TABLE IF EXISTS `diagnosis_terms`');
  }
}
