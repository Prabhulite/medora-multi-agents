import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DischargeMedicationChangeReason1731760000000 implements MigrationInterface {
  name = 'DischargeMedicationChangeReason1731760000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `discharge_home_medication_reviews` ADD `change_reason` varchar(1000) NULL AFTER `reason`');
    await queryRunner.query('ALTER TABLE `discharge_home_medication_reviews` MODIFY `source_detail` varchar(500) NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = await queryRunner.query('SELECT COUNT(*) AS total FROM `discharge_home_medication_reviews` WHERE CHAR_LENGTH(`source_detail`) > 255');
    if (Number(total) > 0) throw new Error('Cannot shrink discharge source details while values longer than 255 characters exist');
    await queryRunner.query('ALTER TABLE `discharge_home_medication_reviews` MODIFY `source_detail` varchar(255) NULL');
    await queryRunner.query('ALTER TABLE `discharge_home_medication_reviews` DROP COLUMN `change_reason`');
  }
}
