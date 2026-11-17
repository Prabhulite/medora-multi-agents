import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PatientCommunication1731500000000 implements MigrationInterface {
  name = 'PatientCommunication1731500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('patient_communications')) return;

    await queryRunner.query(`
      CREATE TABLE \`patient_communications\` (
        \`id\` int UNSIGNED NOT NULL AUTO_INCREMENT,
        \`patient_id\` int UNSIGNED NOT NULL,
        \`channel\` varchar(20) NOT NULL,
        \`direction\` varchar(20) NOT NULL,
        \`subject\` varchar(160) NOT NULL,
        \`summary\` text NOT NULL,
        \`occurred_at\` datetime(6) NOT NULL,
        \`follow_up_due_at\` datetime(6) NULL,
        \`recorded_by_id\` int UNSIGNED NULL,
        \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_patient_communications_patient_time\` (\`patient_id\`, \`occurred_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_patient_communications_patient\` FOREIGN KEY (\`patient_id\`) REFERENCES \`patients\`(\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_patient_communications_recorder\` FOREIGN KEY (\`recorded_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `patient_communications`');
  }
}
