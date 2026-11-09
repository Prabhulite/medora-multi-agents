import 'reflect-metadata';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initializeDataSource } from './config/data-source.js';

async function bootstrap() {
  await initializeDataSource();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`Medora API running on ${env.APP_URL}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
