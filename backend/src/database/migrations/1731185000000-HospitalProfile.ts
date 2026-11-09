import type { MigrationInterface, QueryRunner } from 'typeorm';

export class HospitalProfile1731185000000 implements MigrationInterface {
  name = 'HospitalProfile1731185000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`hospital_profiles\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`hospital_name\` varchar(160) NOT NULL,
        \`hospital_code\` varchar(40) NOT NULL,
        \`hospital_type\` varchar(40) NULL,
        \`registration_number\` varchar(80) NULL,
        \`gst_number\` varchar(40) NULL,
        \`contact_number\` varchar(30) NULL,
        \`email\` varchar(160) NULL,
        \`address\` text NULL,
        \`country\` varchar(80) NULL,
        \`state\` varchar(80) NULL,
        \`district\` varchar(80) NULL,
        \`city\` varchar(80) NULL,
        \`pincode\` varchar(20) NULL,
        \`logo_data\` longtext NULL,
        \`website\` varchar(255) NULL,
        \`time_zone\` varchar(80) NULL,
        \`currency\` varchar(20) NULL DEFAULT 'INR',
        \`date_format\` varchar(40) NULL,
        \`financial_year\` varchar(40) NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_hospital_profiles_code\` (\`hospital_code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `hospital_profiles`');
  }
}
