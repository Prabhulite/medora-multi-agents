import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LaboratoryTestRevisions1734100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE `laboratory_test_revisions` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `test_id` int UNSIGNED NOT NULL, `before_data` json NOT NULL, `after_data` json NOT NULL, `changed_by_id` int UNSIGNED NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_laboratory_test_revisions_test_created` (`test_id`, `created_at`, `id`), PRIMARY KEY (`id`), CONSTRAINT `FK_lab_test_revision_test` FOREIGN KEY (`test_id`) REFERENCES `laboratory_tests` (`id`) ON DELETE RESTRICT, CONSTRAINT `FK_lab_test_revision_user` FOREIGN KEY (`changed_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT) ENGINE=InnoDB');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `laboratory_test_revisions`');
  }
}
