import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1731168000000 implements MigrationInterface {
  name = 'InitSchema1731168000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`permissions\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`code\` varchar(100) NOT NULL,
        \`module\` varchar(80) NOT NULL,
        \`action\` varchar(80) NOT NULL,
        \`description\` varchar(255) NOT NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_permissions_code\` (\`code\`),
        UNIQUE INDEX \`uq_permissions_module_action\` (\`module\`, \`action\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`roles\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`code\` varchar(80) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`description\` varchar(255) NULL,
        \`is_system\` tinyint NOT NULL DEFAULT 0,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_roles_code\` (\`code\`),
        UNIQUE INDEX \`IDX_roles_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`username\` varchar(80) NOT NULL,
        \`email\` varchar(160) NOT NULL,
        \`password_hash\` varchar(255) NOT NULL,
        \`full_name\` varchar(160) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`is_super_admin\` tinyint NOT NULL DEFAULT 0,
        \`last_login_at\` timestamp NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_username\` (\`username\`),
        UNIQUE INDEX \`IDX_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`role_permissions\` (
        \`role_id\` int UNSIGNED NOT NULL,
        \`permission_id\` int UNSIGNED NOT NULL,
        INDEX \`IDX_role_permissions_role_id\` (\`role_id\`),
        INDEX \`IDX_role_permissions_permission_id\` (\`permission_id\`),
        PRIMARY KEY (\`role_id\`, \`permission_id\`),
        CONSTRAINT \`FK_role_permissions_role\`
          FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_role_permissions_permission\`
          FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_roles\` (
        \`user_id\` int UNSIGNED NOT NULL,
        \`role_id\` int UNSIGNED NOT NULL,
        INDEX \`IDX_user_roles_user_id\` (\`user_id\`),
        INDEX \`IDX_user_roles_role_id\` (\`role_id\`),
        PRIMARY KEY (\`user_id\`, \`role_id\`),
        CONSTRAINT \`FK_user_roles_user\`
          FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`FK_user_roles_role\`
          FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_roles\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`role_permissions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`roles\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`permissions\``);
  }
}
