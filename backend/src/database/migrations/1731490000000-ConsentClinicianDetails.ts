import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsentClinicianDetails1731490000000 implements MigrationInterface {
  name = 'ConsentClinicianDetails1731490000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('patient_consents', 'treating_doctor_name'))) {
      await queryRunner.query(
        'ALTER TABLE `patient_consents` ADD `treating_doctor_name` varchar(160) NULL',
      );
    }
    if (!(await queryRunner.hasColumn('patient_consents', 'doctor_registration_number'))) {
      await queryRunner.query(
        'ALTER TABLE `patient_consents` ADD `doctor_registration_number` varchar(80) NULL',
      );
    }
    if (!(await queryRunner.hasColumn('patient_consents', 'admission_date'))) {
      await queryRunner.query('ALTER TABLE `patient_consents` ADD `admission_date` date NULL');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('patient_consents', 'admission_date')) {
      await queryRunner.query('ALTER TABLE `patient_consents` DROP COLUMN `admission_date`');
    }
    if (await queryRunner.hasColumn('patient_consents', 'doctor_registration_number')) {
      await queryRunner.query(
        'ALTER TABLE `patient_consents` DROP COLUMN `doctor_registration_number`',
      );
    }
    if (await queryRunner.hasColumn('patient_consents', 'treating_doctor_name')) {
      await queryRunner.query(
        'ALTER TABLE `patient_consents` DROP COLUMN `treating_doctor_name`',
      );
    }
  }
}
