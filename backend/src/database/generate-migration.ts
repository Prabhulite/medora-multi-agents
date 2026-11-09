import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const dataSource = 'src/config/data-source.cli.ts';
const cli = './node_modules/typeorm/cli.js';

function run(args: string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('tsx', [cli, ...args], {
      cwd: backendRoot,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

function resolveMigrationPath(input?: string): string {
  if (!input) {
    return path.join('src', 'database', 'migrations', 'SchemaChange');
  }

  const cleaned = input.replace(/\.ts$/i, '');
  if (cleaned.includes('/') || cleaned.includes('\\')) {
    return cleaned;
  }

  const safeName = cleaned.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeName) {
    throw new Error('Invalid migration name');
  }

  return path.join('src', 'database', 'migrations', safeName);
}

async function main(): Promise<void> {
  const migrationPath = resolveMigrationPath(process.argv[2]);

  console.log(`Generating migration: ${migrationPath}`);
  const generateCode = await run([
    'migration:generate',
    migrationPath,
    '-d',
    dataSource,
  ]);

  if (generateCode !== 0) {
    process.exit(generateCode);
  }

  console.log('Applying pending migrations...');
  const runCode = await run(['migration:run', '-d', dataSource]);
  process.exit(runCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
