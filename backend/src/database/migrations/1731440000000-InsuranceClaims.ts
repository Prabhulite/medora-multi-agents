import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InsuranceClaims1731440000000 implements MigrationInterface {
  name = 'InsuranceClaims1731440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('insurance_claims')) return;

    await queryRunner.query(`
      CREATE TABLE \`insurance_claims\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`invoice_id\` int UNSIGNED NOT NULL,
        \`claim_number\` varchar(40) NOT NULL,
        \`payer_name\` varchar(160) NOT NULL,
        \`policy_number\` varchar(120) NOT NULL,
        \`claimed_amount\` decimal(12,2) NOT NULL,
        \`approved_amount\` decimal(12,2) NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'draft',
        \`notes\` varchar(2000) NULL,
        \`decision_note\` varchar(2000) NULL,
        \`submitted_at\` datetime(6) NULL,
        \`decided_at\` datetime(6) NULL,
        \`settled_at\` datetime(6) NULL,
        \`created_by_id\` int UNSIGNED NULL,
        \`updated_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_claim_invoice\` (\`invoice_id\`),
        UNIQUE INDEX \`IDX_claim_number\` (\`claim_number\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_claim_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`invoices\`(\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_claim_created_by\` FOREIGN KEY (\`created_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_claim_updated_by\` FOREIGN KEY (\`updated_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `insurance_claims`');
  }
}
