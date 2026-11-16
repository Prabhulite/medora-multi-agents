import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ConsentClinicianDetails1731490000000 implements MigrationInterface {
  name = 'ConsentClinicianDetails1731490000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `patient_consents` ADD `treating_doctor_name` varchar(160) NULL, ADD `doctor_registration_number` varchar(80) NULL, ADD `admission_date` date NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `patient_consents` DROP COLUMN `admission_date`, DROP COLUMN `doctor_registration_number`, DROP COLUMN `treating_doctor_name`');
  }
}
