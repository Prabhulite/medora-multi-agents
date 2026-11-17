import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EncounterSigning1731510000000 implements MigrationInterface {
  name = 'EncounterSigning1731510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('clinical_encounters', 'signed_at'))) {
      await queryRunner.query(
        'ALTER TABLE `clinical_encounters` ADD `signed_at` timestamp(6) NULL',
      );
    }
    if (!(await queryRunner.hasColumn('clinical_encounters', 'signed_by_id'))) {
      await queryRunner.query(
        'ALTER TABLE `clinical_encounters` ADD `signed_by_id` int UNSIGNED NULL',
      );
    }

    const table = await queryRunner.getTable('clinical_encounters');
    if (
      table &&
      !table.foreignKeys.some((fk) => fk.name === 'FK_clinical_encounters_signer')
    ) {
      await queryRunner.query(
        'ALTER TABLE `clinical_encounters` ADD CONSTRAINT `FK_clinical_encounters_signer` FOREIGN KEY (`signed_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinical_encounters');
    if (table?.foreignKeys.some((fk) => fk.name === 'FK_clinical_encounters_signer')) {
      await queryRunner.query(
        'ALTER TABLE `clinical_encounters` DROP FOREIGN KEY `FK_clinical_encounters_signer`',
      );
    }
    if (await queryRunner.hasColumn('clinical_encounters', 'signed_by_id')) {
      await queryRunner.query('ALTER TABLE `clinical_encounters` DROP COLUMN `signed_by_id`');
    }
    if (await queryRunner.hasColumn('clinical_encounters', 'signed_at')) {
      await queryRunner.query('ALTER TABLE `clinical_encounters` DROP COLUMN `signed_at`');
    }
  }
}
