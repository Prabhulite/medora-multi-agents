import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingCarePlanReviews1731840000000 implements MigrationInterface {
  name = 'NursingCarePlanReviews1731840000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`nursing_care_plan_reviews\` (
      \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
      \`care_plan_id\` int UNSIGNED NOT NULL,
      \`review_note\` varchar(2000) NOT NULL,
      \`previous_review_at\` datetime(6) NULL,
      \`next_review_at\` datetime(6) NOT NULL,
      \`reviewed_by_id\` int UNSIGNED NULL,
      \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (\`id\`),
      INDEX \`IDX_care_plan_reviews_plan\` (\`care_plan_id\`, \`id\`),
      CONSTRAINT \`FK_care_plan_review_plan\` FOREIGN KEY (\`care_plan_id\`) REFERENCES \`nursing_care_plans\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`FK_care_plan_review_user\` FOREIGN KEY (\`reviewed_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
    ) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `nursing_care_plan_reviews`');
  }
}
