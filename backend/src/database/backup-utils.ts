import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export interface BackupManifest { format: 'medora-mysql-v1'; sourceDatabase: string; createdAt: string; sha256: string; bytes: number }

export function safeDatabaseName(name: string): string {
  if (!/^[A-Za-z0-9_]{1,64}$/.test(name)) throw new Error('Database name must contain only letters, digits, and underscores');
  return name;
}

export async function mysqlBinary(kind: 'mysql' | 'mysqldump'): Promise<string> {
  const configured = process.env[kind === 'mysql' ? 'MYSQL_BIN' : 'MYSQLDUMP_BIN'];
  if (configured) return configured;
  if (process.platform === 'win32') {
    const common = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MySQL', 'MySQL Server 8.0', 'bin', `${kind}.exe`);
    try { await access(common); return common; } catch { /* use PATH */ }
  }
  return kind;
}

export function mysqlEnvironment(): NodeJS.ProcessEnv { return { ...process.env, MYSQL_PWD: env.DB_PASSWORD }; }

export async function runCommand(binary: string, args: string[], stdinFile?: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, args, { env: mysqlEnvironment(), stdio: [stdinFile ? 'pipe' : 'ignore', 'ignore', 'inherit'], windowsHide: true });
    child.once('error', reject);
    if (stdinFile) {
      const input = createReadStream(stdinFile);
      input.once('error', (error) => { child.kill(); reject(error); });
      child.stdin!.on('error', () => undefined);
      input.pipe(child.stdin!);
    }
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(binary)} exited with code ${code}`)));
  });
}

export async function fileDigest(file: string): Promise<{ sha256: string; bytes: number }> {
  const hash = createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) { const data = chunk as Buffer; bytes += data.length; hash.update(data); }
  return { sha256: hash.digest('hex'), bytes };
}
