import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AdmissionIntakeOutput1795400000000 implements MigrationInterface {
  name = 'AdmissionIntakeOutput1795400000000'

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`CREATE TABLE admission_intake_output (
      id int UNSIGNED NOT NULL AUTO_INCREMENT,
      admission_id int UNSIGNED NOT NULL,
      kind varchar(10) NOT NULL,
      category varchar(60) NOT NULL,
      amount_ml decimal(9,1) NOT NULL,
      observed_at datetime NOT NULL,
      notes varchar(500) NULL,
      recorded_by_id int UNSIGNED NULL,
      created_at timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      INDEX IDX_admission_io_time (admission_id, observed_at),
      CONSTRAINT FK_admission_io_admission FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
      CONSTRAINT FK_admission_io_user FOREIGN KEY (recorded_by_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`)
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query('DROP TABLE admission_intake_output')
  }
}
