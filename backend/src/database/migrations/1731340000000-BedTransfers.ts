import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BedTransfers1731340000000 implements MigrationInterface {
  name = 'BedTransfers1731340000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE \`bed_transfers\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`admission_id\` int UNSIGNED NOT NULL, \`from_bed_id\` int UNSIGNED NOT NULL, \`to_bed_id\` int UNSIGNED NOT NULL, \`reason\` varchar(500) NOT NULL, \`transferred_by_id\` int UNSIGNED NULL, \`transferred_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`), INDEX \`IDX_bed_transfer_admission_time\` (\`admission_id\`, \`transferred_at\`), CONSTRAINT \`FK_transfer_admission\` FOREIGN KEY (\`admission_id\`) REFERENCES \`admissions\`(\`id\`) ON DELETE CASCADE, CONSTRAINT \`FK_transfer_from_bed\` FOREIGN KEY (\`from_bed_id\`) REFERENCES \`beds\`(\`id\`) ON DELETE RESTRICT, CONSTRAINT \`FK_transfer_to_bed\` FOREIGN KEY (\`to_bed_id\`) REFERENCES \`beds\`(\`id\`) ON DELETE RESTRICT, CONSTRAINT \`FK_transfer_user\` FOREIGN KEY (\`transferred_by_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL) ENGINE=InnoDB`);
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE `bed_transfers`'); }
}
