import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { fileDigest, mysqlBinary, runCommand, safeDatabaseName, type BackupManifest } from './backup-utils.js';

async function main() {
  process.umask(0o077);
  const database = safeDatabaseName(env.DB_NAME);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const output = path.resolve(process.argv[2] || path.join('backups', `${database}-${stamp}.sql`));
  if (!output.toLowerCase().endsWith('.sql')) throw new Error('Backup path must end in .sql');
  const manifestPath = `${output}.manifest.json`;
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  for (const file of [output, manifestPath]) { try { await stat(file); throw new Error(`Refusing to overwrite ${file}`); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
  const temporary = `${output}.${randomBytes(6).toString('hex')}.tmp`;
  let outputCreated = false;
  let manifestCreated = false;
  try {
    await runCommand(await mysqlBinary('mysqldump'), ['--host', env.DB_HOST, '--port', String(env.DB_PORT), '--user', env.DB_USER, '--single-transaction', '--quick', '--routines', '--events', '--triggers', '--hex-blob', '--set-gtid-purged=OFF', '--column-statistics=0', '--no-tablespaces', `--result-file=${temporary}`, database]);
    const digest = await fileDigest(temporary);
    if (digest.bytes < 100) throw new Error('Backup is unexpectedly small');
    const manifest: BackupManifest = { format: 'medora-mysql-v1', sourceDatabase: database, createdAt: new Date().toISOString(), ...digest };
    await copyFile(temporary, output, constants.COPYFILE_EXCL);
    outputCreated = true;
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    manifestCreated = true;
    await rm(temporary, { force: true });
    console.log(`Backup created: ${output}`);
    console.log(`Manifest: ${manifestPath}`);
    console.log(`SHA-256: ${manifest.sha256}`);
  } catch (error) {
    await rm(temporary, { force: true });
    if (outputCreated) await rm(output, { force: true });
    if (manifestCreated) await rm(manifestPath, { force: true });
    throw error;
  }
}

main().catch((error) => { console.error('Backup failed:', error instanceof Error ? error.message : error); process.exitCode = 1; });
