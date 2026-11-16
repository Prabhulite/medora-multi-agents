import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MedicationAdministrations1731350000000 implements MigrationInterface {
  name = 'MedicationAdministrations1731350000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`medication_administrations\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`admission_id\` int UNSIGNED NOT NULL, \`prescription_id\` int UNSIGNED NOT NULL, \`outcome\` varchar(20) NOT NULL, \`dose_given\` varchar(80) NULL, \`route\` varchar(40) NULL, \`notes\` varchar(1000) NULL, \`administered_by_id\` int UNSIGNED NULL, \`recorded_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_med_admin_admission_time\` (\`admission_id\`, \`recorded_at\`), CONSTRAINT \`FK_med_admin_admission\` FOREIGN KEY (\`admission_id\`) REFERENCES \`admissions\`(\`id\`) ON DELETE CASCADE, CONSTRAINT \`FK_med_admin_prescription\` FOREIGN KEY (\`prescription_id\`) REFERENCES \`prescriptions\`(\`id\`) ON DELETE RESTRICT, CONSTRAINT \`FK_med_admin_user\` FOREIGN KEY (\`administered_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `medication_administrations`'); }
}
