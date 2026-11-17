import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingCarePlanDueIndex1731830000000 implements MigrationInterface {
  name = 'NursingCarePlanDueIndex1731830000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_nursing_care_plans_due` ON `nursing_care_plans` (`status`, `review_at`, `id`)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_nursing_care_plans_due` ON `nursing_care_plans`');
  }
}
