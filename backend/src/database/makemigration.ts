import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');

const name = process.argv[2];

if (!name) {
  console.error('Usage: npm run makemigration -- MigrationName');
  process.exit(1);
}

const safeName = name.replace(/\.ts$/i, '').replace(/[^a-zA-Z0-9_-]/g, '');
if (!safeName) {
  console.error('Invalid migration name');
  process.exit(1);
}

const outputPath = path.join('src', 'database', 'migrations', safeName);

const child = spawn(
  'npx',
  [
    'tsx',
    './node_modules/typeorm/cli.js',
    'migration:generate',
    outputPath,
    '-d',
    'src/config/data-source.cli.ts',
  ],
  {
    cwd: backendRoot,
    stdio: 'inherit',
    shell: true,
  },
);

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
