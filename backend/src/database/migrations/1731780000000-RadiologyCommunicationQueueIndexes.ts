import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RadiologyCommunicationQueueIndexes1731780000000 implements MigrationInterface {
  name = 'RadiologyCommunicationQueueIndexes1731780000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_radiology_communication_delivery` ON `radiology_communications` (`order_id`, `outcome`, `created_at`, `occurred_at`)');
    await queryRunner.query('CREATE INDEX `IDX_radiology_orders_communication_queue` ON `radiology_orders` (`status`, `priority`, `performed_at`, `id`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_radiology_orders_communication_queue` ON `radiology_orders`');
    await queryRunner.query('DROP INDEX `IDX_radiology_communication_delivery` ON `radiology_communications`');
  }
}
