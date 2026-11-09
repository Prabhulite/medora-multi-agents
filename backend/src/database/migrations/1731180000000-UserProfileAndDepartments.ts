import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfileAndDepartments1731180000000 implements MigrationInterface {
  name = 'UserProfileAndDepartments1731180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`departments\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`code\` varchar(80) NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_departments_code\` (\`code\`),
        UNIQUE INDEX \`IDX_departments_name\` (\`name\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD COLUMN \`employee_id\` varchar(40) NULL AFTER \`id\`,
        ADD COLUMN \`mobile_number\` varchar(20) NULL AFTER \`full_name\`,
        ADD COLUMN \`gender\` varchar(20) NULL AFTER \`mobile_number\`,
        ADD COLUMN \`designation\` varchar(120) NULL AFTER \`gender\`,
        ADD COLUMN \`department_id\` int UNSIGNED NULL AFTER \`designation\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\`
        MODIFY COLUMN \`email\` varchar(160) NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_users_employee_id\` ON \`users\` (\`employee_id\`)
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\`
        ADD CONSTRAINT \`FK_users_department\`
        FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`)
        ON DELETE SET NULL ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_users_department\`
    `);
    await queryRunner.query(`
      DROP INDEX \`IDX_users_employee_id\` ON \`users\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`users\`
        DROP COLUMN \`department_id\`,
        DROP COLUMN \`designation\`,
        DROP COLUMN \`gender\`,
        DROP COLUMN \`mobile_number\`,
        DROP COLUMN \`employee_id\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`users\`
        MODIFY COLUMN \`email\` varchar(160) NOT NULL
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS \`departments\``);
  }
}
