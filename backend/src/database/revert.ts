import 'reflect-metadata';
import { closeDataSource, initializeDataSource } from '../config/data-source.js';

async function revertMigration(): Promise<void> {
  const dataSource = await initializeDataSource();
  const executed = await dataSource.query(
    'SELECT id, timestamp, name FROM migrations ORDER BY id DESC LIMIT 1',
  );

  if (!executed.length) {
    console.log('No migrations to revert');
    return;
  }

  await dataSource.undoLastMigration({ transaction: 'each' });
  console.log(`Reverted migration: ${executed[0].name}`);
}

revertMigration()
  .then(async () => {
    await closeDataSource();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('Migration revert failed:', error);
    await closeDataSource();
    process.exit(1);
  });
