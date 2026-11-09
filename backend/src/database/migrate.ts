import 'reflect-metadata';
import { closeDataSource, initializeDataSource } from '../config/data-source.js';

async function runMigrations(): Promise<void> {
  const dataSource = await initializeDataSource();
  const executed = await dataSource.runMigrations({ transaction: 'each' });

  if (executed.length === 0) {
    console.log('No pending migrations');
    return;
  }

  for (const migration of executed) {
    console.log(`Applied migration: ${migration.name}`);
  }
}

runMigrations()
  .then(async () => {
    await closeDataSource();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Migration failed:', error);
    await closeDataSource();
    process.exit(1);
  });
