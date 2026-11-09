import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedByOnUsersAndRoles1731195000000 implements MigrationInterface {
  name = 'CreatedByOnUsersAndRoles1731195000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`created_by\` int UNSIGNED NULL AFTER \`is_super_admin\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD CONSTRAINT \`FK_users_created_by\`
        FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE \`roles\`
        ADD COLUMN \`created_by\` int UNSIGNED NULL AFTER \`is_active\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`roles\`
        ADD CONSTRAINT \`FK_roles_created_by\`
        FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      UPDATE \`users\` u
      JOIN \`users\` admin ON admin.is_super_admin = 1
      SET u.created_by = admin.id
      WHERE u.created_by IS NULL
    `);

    await queryRunner.query(`
      UPDATE \`roles\` r
      JOIN \`users\` admin ON admin.is_super_admin = 1
      SET r.created_by = admin.id
      WHERE r.created_by IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`roles\` DROP FOREIGN KEY \`FK_roles_created_by\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`roles\` DROP COLUMN \`created_by\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_created_by\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`users\` DROP COLUMN \`created_by\`
    `);
  }
}
