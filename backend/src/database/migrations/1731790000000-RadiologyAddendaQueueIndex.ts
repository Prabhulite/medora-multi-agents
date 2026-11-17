import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RadiologyAddendaQueueIndex1731790000000 implements MigrationInterface {
  name = 'RadiologyAddendaQueueIndex1731790000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_radiology_addenda_order_created` ON `radiology_report_addenda` (`order_id`, `created_at`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_radiology_addenda_order_created` ON `radiology_report_addenda`');
  }
}
