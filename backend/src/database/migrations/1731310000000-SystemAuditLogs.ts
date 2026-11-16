import type { MigrationInterface, QueryRunner } from 'typeorm';
export class SystemAuditLogs1731310000000 implements MigrationInterface {
  name = 'SystemAuditLogs1731310000000';
  public async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`system_audit_logs\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`request_id\` varchar(80) NULL, \`user_id\` int UNSIGNED NULL, \`method\` varchar(10) NOT NULL, \`path\` varchar(255) NOT NULL, \`status_code\` smallint UNSIGNED NOT NULL, \`module\` varchar(80) NULL, \`ip_address\` varchar(45) NULL, \`user_agent\` varchar(255) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_audit_created\` (\`created_at\`), INDEX \`IDX_audit_user\` (\`user_id\`), CONSTRAINT \`FK_audit_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE) ENGINE=InnoDB`); }
  public async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE IF EXISTS `system_audit_logs`'); }
}
