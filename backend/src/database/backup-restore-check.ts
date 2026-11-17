import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { appendFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();
const runFile = promisify(execFile);
const nonce = randomBytes(6).toString('hex');
const source = `medora_it_backup_${nonce}`;
const target = `medora_restore_${nonce}`;
const tamperedTarget = `medora_restore_tampered_${nonce}`;
const temporary = await mkdtemp(path.join(tmpdir(), 'medora-backup-check-'));
const resolvedTemporary = path.resolve(temporary);
if (!resolvedTemporary.startsWith(path.resolve(tmpdir()) + path.sep) || !path.basename(resolvedTemporary).startsWith('medora-backup-check-')) throw new Error('Unsafe backup test directory');
const dump = path.join(temporary, 'synthetic.sql');
const backupScript = path.resolve('dist/database/backup.js');
const restoreScript = path.resolve('dist/database/restore.js');
const migrationCli = path.resolve('node_modules/typeorm/cli.js');
const dataSourceConfig = path.resolve('dist/config/data-source.cli.js');
const seedScript = path.resolve('dist/database/seed.js');
const childEnv = { ...process.env, DB_NAME: source, NODE_ENV: 'test' };
const admin = await mysql.createConnection({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });

try {
  await admin.query(`CREATE DATABASE \`${source}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.query(`CREATE TABLE \`${source}\`.probe (id int PRIMARY KEY, label varchar(40) NOT NULL)`);
  await admin.query(`INSERT INTO \`${source}\`.probe VALUES (1, 'synthetic')`);
  await runFile(process.execPath, [migrationCli, 'migration:run', '-d', dataSourceConfig], { env: childEnv });
  await runFile(process.execPath, [seedScript], { env: childEnv });
  await runFile(process.execPath, [backupScript, dump], { env: childEnv });
  await runFile(process.execPath, [restoreScript, dump, target], { env: childEnv });
  const [rows] = await admin.query<mysql.RowDataPacket[]>(`SELECT label FROM \`${target}\`.probe WHERE id = 1`);
  assert.equal(rows[0]?.label, 'synthetic');
    for (const table of ['migrations', 'users', 'roles', 'menus', 'laboratory_orders', 'laboratory_result_addenda', 'radiology_orders', 'radiology_resources', 'radiology_schedule_events', 'radiology_communications', 'radiology_report_addenda', 'blood_units']) {
    const [sourceCount] = await admin.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS total FROM \`${source}\`.\`${table}\``);
    const [targetCount] = await admin.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS total FROM \`${target}\`.\`${table}\``);
    assert.equal(targetCount[0]?.total, sourceCount[0]?.total, `Restored count mismatch for ${table}`);
  }
  const [seededUsers] = await admin.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS total FROM \`${target}\`.users`);
  assert.ok(seededUsers[0]?.total > 0, 'Restored database should contain seeded users');
  await assert.rejects(runFile(process.execPath, [restoreScript, dump, target], { env: childEnv }));
  await appendFile(dump, '\n-- checksum test\n');
  await assert.rejects(runFile(process.execPath, [restoreScript, dump, tamperedTarget], { env: childEnv }));
  const [schemas] = await admin.execute<mysql.RowDataPacket[]>('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [tamperedTarget]);
  assert.equal(schemas.length, 0);
  console.log('Medora backup/restore verified: migrated schema, seed data, overwrite refusal, and checksum rejection.');
} finally {
  await admin.query(`DROP DATABASE IF EXISTS \`${source}\``);
  await admin.query(`DROP DATABASE IF EXISTS \`${target}\``);
  await admin.end();
  await rm(resolvedTemporary, { recursive: true, force: true });
}
