import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RadiologyWorklistIndex1731800000000 implements MigrationInterface {
  name = 'RadiologyWorklistIndex1731800000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_radiology_orders_worklist` ON `radiology_orders` (`ordered_at`, `id`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_radiology_orders_worklist` ON `radiology_orders`');
  }
}
