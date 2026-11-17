import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EncounterDiagnosisProvenance1731550000000 implements MigrationInterface {
  name = 'EncounterDiagnosisProvenance1731550000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `clinical_encounters` ADD `diagnosis_term_id` int UNSIGNED NULL');
    await queryRunner.query('ALTER TABLE `clinical_encounters` ADD `diagnosis_version` varchar(40) NULL');
    await queryRunner.query('CREATE INDEX `IDX_clinical_encounters_diagnosis_term` ON `clinical_encounters` (`diagnosis_term_id`)');
    await queryRunner.query('ALTER TABLE `clinical_encounters` ADD CONSTRAINT `FK_clinical_encounters_diagnosis_term` FOREIGN KEY (`diagnosis_term_id`) REFERENCES `diagnosis_terms`(`id`) ON DELETE SET NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `clinical_encounters` DROP FOREIGN KEY `FK_clinical_encounters_diagnosis_term`');
    await queryRunner.query('DROP INDEX `IDX_clinical_encounters_diagnosis_term` ON `clinical_encounters`');
    await queryRunner.query('ALTER TABLE `clinical_encounters` DROP COLUMN `diagnosis_version`');
    await queryRunner.query('ALTER TABLE `clinical_encounters` DROP COLUMN `diagnosis_term_id`');
  }
}
