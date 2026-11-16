import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserSessionVersion1731400000000 implements MigrationInterface {
  name = 'UserSessionVersion1731400000000';
  async up(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE `users` ADD `session_version` int UNSIGNED NOT NULL DEFAULT 1'); }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('ALTER TABLE `users` DROP COLUMN `session_version`'); }
}
