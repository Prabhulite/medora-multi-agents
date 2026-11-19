import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpenseActivities1795000000000 implements MigrationInterface {
  name = 'CreateExpenseActivities1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`expense_activities\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
      \`title\` varchar(120) NOT NULL,
      \`category\` varchar(80) NOT NULL,
      \`amount\` decimal(12,2) NOT NULL,
      \`date\` date NOT NULL,
      \`notes\` varchar(500) NULL,
      \`type\` enum('activity','expense') NOT NULL DEFAULT 'expense',
      \`created_by_user_id\` int UNSIGNED NULL,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      INDEX \`idx_expense_activities_date\` (\`date\`),
      INDEX \`idx_expense_activities_created_by\` (\`created_by_user_id\`),
      CONSTRAINT \`fk_expense_activities_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `expense_activities`');
  }
}
