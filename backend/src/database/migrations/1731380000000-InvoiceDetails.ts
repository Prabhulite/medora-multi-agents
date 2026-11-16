import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoiceDetails1731380000000 implements MigrationInterface {
  name = 'InvoiceDetails1731380000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `invoices` ADD `due_date` date NULL, ADD `notes` text NULL');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `invoices` DROP COLUMN `notes`, DROP COLUMN `due_date`');
  }
}
