import type { MigrationInterface, QueryRunner } from 'typeorm';

export class OpCheckinFields1731550000000 implements MigrationInterface {
  name = 'OpCheckinFields1731550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('patients', 'family_id'))) {
      await queryRunner.query(
        'ALTER TABLE `patients` ADD `family_id` varchar(40) NULL',
      );
    }

    const visitColumns: Array<{ name: string; sql: string }> = [
      {
        name: 'checked_out_at',
        sql: 'ALTER TABLE `patient_visits` ADD `checked_out_at` timestamp NULL',
      },
      {
        name: 'checked_out_by_id',
        sql: 'ALTER TABLE `patient_visits` ADD `checked_out_by_id` int UNSIGNED NULL',
      },
      {
        name: 'nature_of_visit',
        sql: 'ALTER TABLE `patient_visits` ADD `nature_of_visit` varchar(60) NULL',
      },
      {
        name: 'purpose_of_visit',
        sql: 'ALTER TABLE `patient_visits` ADD `purpose_of_visit` varchar(255) NULL',
      },
      {
        name: 'visit_referred_by',
        sql: 'ALTER TABLE `patient_visits` ADD `visit_referred_by` varchar(120) NULL',
      },
      {
        name: 'appointment_id',
        sql: 'ALTER TABLE `patient_visits` ADD `appointment_id` int UNSIGNED NULL',
      },
      {
        name: 'is_mlc',
        sql: 'ALTER TABLE `patient_visits` ADD `is_mlc` tinyint NOT NULL DEFAULT 0',
      },
      {
        name: 'had_food',
        sql: 'ALTER TABLE `patient_visits` ADD `had_food` tinyint NOT NULL DEFAULT 0',
      },
      {
        name: 'token_number',
        sql: 'ALTER TABLE `patient_visits` ADD `token_number` int UNSIGNED NULL',
      },
    ];

    for (const column of visitColumns) {
      if (!(await queryRunner.hasColumn('patient_visits', column.name))) {
        await queryRunner.query(column.sql);
      }
    }

    const indexes = await queryRunner.query(`SHOW INDEX FROM \`patient_visits\``);
    const indexNames = new Set(
      (indexes as Array<{ Key_name: string }>).map((row) => row.Key_name),
    );

    if (!indexNames.has('IDX_patient_visits_checked_out_at')) {
      await queryRunner.query(
        'CREATE INDEX `IDX_patient_visits_checked_out_at` ON `patient_visits` (`checked_out_at`)',
      );
    }
    if (!indexNames.has('IDX_patient_visits_appointment_id')) {
      await queryRunner.query(
        'CREATE INDEX `IDX_patient_visits_appointment_id` ON `patient_visits` (`appointment_id`)',
      );
    }
    if (!indexNames.has('IDX_patient_visits_token_number')) {
      await queryRunner.query(
        'CREATE INDEX `IDX_patient_visits_token_number` ON `patient_visits` (`token_number`)',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropIndex = async (name: string) => {
      const indexes = await queryRunner.query(`SHOW INDEX FROM \`patient_visits\``);
      const indexNames = new Set(
        (indexes as Array<{ Key_name: string }>).map((row) => row.Key_name),
      );
      if (indexNames.has(name)) {
        await queryRunner.query(`DROP INDEX \`${name}\` ON \`patient_visits\``);
      }
    };

    await dropIndex('IDX_patient_visits_token_number');
    await dropIndex('IDX_patient_visits_appointment_id');
    await dropIndex('IDX_patient_visits_checked_out_at');

    for (const column of [
      'token_number',
      'had_food',
      'is_mlc',
      'appointment_id',
      'visit_referred_by',
      'purpose_of_visit',
      'nature_of_visit',
      'checked_out_by_id',
      'checked_out_at',
    ]) {
      if (await queryRunner.hasColumn('patient_visits', column)) {
        await queryRunner.query(`ALTER TABLE \`patient_visits\` DROP COLUMN \`${column}\``);
      }
    }

    if (await queryRunner.hasColumn('patients', 'family_id')) {
      await queryRunner.query('ALTER TABLE `patients` DROP COLUMN `family_id`');
    }
  }
}
