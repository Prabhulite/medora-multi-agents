import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMenus1731172000000 implements MigrationInterface {
  name = 'AddMenus1731172000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`menus\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`code\` varchar(80) NOT NULL,
        \`label\` varchar(120) NOT NULL,
        \`route\` varchar(160) NOT NULL,
        \`icon\` varchar(60) NOT NULL DEFAULT 'dashboard',
        \`permission_code\` varchar(100) NULL,
        \`parent_id\` int UNSIGNED NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        \`is_system\` tinyint NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_menus_code\` (\`code\`),
        INDEX \`IDX_menus_sort_order\` (\`sort_order\`),
        INDEX \`IDX_menus_parent_id\` (\`parent_id\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `menus`');
  }
}
