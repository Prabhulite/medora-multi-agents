import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NursingHandoffDischargeClosure1731890000000 implements MigrationInterface {
  name = 'NursingHandoffDischargeClosure1731890000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `nursing_handoffs` ADD `closed_on_discharge_at` datetime(6) NULL, ADD `closed_on_discharge_by_id` int UNSIGNED NULL');
    await queryRunner.query('ALTER TABLE `nursing_handoffs` ADD CONSTRAINT `FK_nursing_handoff_discharge_closer` FOREIGN KEY (`closed_on_discharge_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL');
    await queryRunner.query("UPDATE nursing_handoffs handoff INNER JOIN admissions admission ON admission.id = handoff.admission_id SET handoff.closed_on_discharge_at = COALESCE(admission.discharged_at, NOW(6)), handoff.closed_on_discharge_by_id = admission.discharged_by_id WHERE admission.status = 'discharged' AND handoff.acknowledged_at IS NULL");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `nursing_handoffs` DROP FOREIGN KEY `FK_nursing_handoff_discharge_closer`');
    await queryRunner.query('ALTER TABLE `nursing_handoffs` DROP COLUMN `closed_on_discharge_by_id`, DROP COLUMN `closed_on_discharge_at`');
  }
}
