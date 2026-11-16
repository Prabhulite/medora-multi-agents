import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { fileDigest, mysqlBinary, runCommand, safeDatabaseName, type BackupManifest } from './backup-utils.js';

async function main() {
  const inputArg = process.argv[2]; const targetArg = process.argv[3];
  if (!inputArg || !targetArg) throw new Error('Usage: npm run db:restore -- <backup.sql> <medora_restore_new_database>');
  const input = path.resolve(inputArg);
  const target = safeDatabaseName(targetArg);
  if (!/^medora_restore_[A-Za-z0-9_]+$/.test(target)) throw new Error('Restore target must start with medora_restore_');
  if (target === env.DB_NAME) throw new Error('Restore target must differ from the configured live database');
  const manifest = JSON.parse(await readFile(`${input}.manifest.json`, 'utf8')) as BackupManifest;
  if (manifest.format !== 'medora-mysql-v1' || !/^[0-9a-f]{64}$/.test(manifest.sha256) || !Number.isSafeInteger(manifest.bytes) || manifest.bytes < 100) throw new Error('Invalid backup manifest');
  const digest = await fileDigest(input);
  if (digest.sha256 !== manifest.sha256 || digest.bytes !== manifest.bytes) throw new Error('Backup checksum mismatch');
  const admin = await mysql.createConnection({ host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD });
  try {
    const [rows] = await admin.execute<mysql.RowDataPacket[]>('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [target]);
    if (rows.length) throw new Error(`Refusing to overwrite existing database: ${target}`);
    await admin.query(`CREATE DATABASE \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally { await admin.end(); }
  try {
    await runCommand(await mysqlBinary('mysql'), ['--host', env.DB_HOST, '--port', String(env.DB_PORT), '--user', env.DB_USER, '--database', target, '--binary-mode'], input);
    console.log(`Restored backup into new database: ${target}`);
    console.log('Verify the restored database before changing DB_NAME or exposing it to users.');
  } catch (error) {
    console.error(`Restore failed; inspect the new database ${target} before deciding whether to remove it.`);
    throw error;
  }
}

main().catch((error) => { console.error('Restore failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
