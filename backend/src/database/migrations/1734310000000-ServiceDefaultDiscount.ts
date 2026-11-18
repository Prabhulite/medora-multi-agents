import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceDefaultDiscount1734310000000 implements MigrationInterface {
  name = 'ServiceDefaultDiscount1734310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('service_master');
    if (!table) return;
    if (!table.findColumnByName('default_discount_percent')) {
      await queryRunner.query(`
        ALTER TABLE \`service_master\`
        ADD COLUMN \`default_discount_percent\` decimal(5,2) NULL AFTER \`allow_discount\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('service_master');
    if (!table?.findColumnByName('default_discount_percent')) return;
    await queryRunner.query(`
      ALTER TABLE \`service_master\`
      DROP COLUMN \`default_discount_percent\`
    `);
  }
}
