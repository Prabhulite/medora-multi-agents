import 'reflect-metadata';
import { closeDataSource, initializeDataSource } from '../config/data-source.js';
import { seedStarterServices } from './starter-services.js';

try {
  const dataSource = await initializeDataSource();
  const created = await seedStarterServices(dataSource);
  console.log(`Starter billing services created: ${created}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await closeDataSource();
}
