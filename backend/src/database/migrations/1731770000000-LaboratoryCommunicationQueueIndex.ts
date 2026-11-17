import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryCommunicationQueueIndex1731770000000 implements MigrationInterface {
  name = 'LaboratoryCommunicationQueueIndex1731770000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE INDEX `IDX_laboratory_communication_delivery` ON `laboratory_communications` (`order_id`, `outcome`, `occurred_at`)');
    await queryRunner.query('CREATE INDEX `IDX_laboratory_orders_communication_queue` ON `laboratory_orders` (`status`, `priority`, `completed_at`, `id`)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX `IDX_laboratory_orders_communication_queue` ON `laboratory_orders`');
    await queryRunner.query('DROP INDEX `IDX_laboratory_communication_delivery` ON `laboratory_communications`');
  }
}
