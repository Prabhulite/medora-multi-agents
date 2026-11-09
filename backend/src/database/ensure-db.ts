import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

async function ensureDatabase(): Promise<void> {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  console.log(`Database ready: ${env.DB_NAME}`);
}

ensureDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to ensure database:', error);
    process.exit(1);
  });
