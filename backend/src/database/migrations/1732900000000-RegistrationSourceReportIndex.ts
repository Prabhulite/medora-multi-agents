import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegistrationSourceReportIndex1732900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_patients_registration_source_report` ON `patients` (`registration_at`, `registration_source_id`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_patients_registration_source_report` ON `patients`');
  }
}
