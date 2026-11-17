import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffPendingIndex1731860000000 implements MigrationInterface {
  name = 'NursingHandoffPendingIndex1731860000000';
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('CREATE INDEX `IDX_nursing_handoffs_pending` ON `nursing_handoffs` (`acknowledged_at`, `id`)'); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP INDEX `IDX_nursing_handoffs_pending` ON `nursing_handoffs`'); }
}
