import 'reflect-metadata';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import {
  Department,
  Doctor,
  DoctorConsultationFee,
  DoctorDocument,
  DoctorLeave,
  DoctorSchedule,
  HospitalDocument,
  HospitalProfile,
  Menu,
  Permission,
  Role,
  Specialization,
  User,
} from '../database/entities/index.js';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities: [
    User,
    Role,
    Permission,
    Menu,
    Department,
    HospitalProfile,
    HospitalDocument,
    Specialization,
    Doctor,
    DoctorConsultationFee,
    DoctorSchedule,
    DoctorLeave,
    DoctorDocument,
  ],
  migrations: [path.join(__dirname, '../database/migrations/*.{ts,js}')],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: env.NODE_ENV === 'development',
  timezone: 'Z',
});

export async function initializeDataSource(): Promise<DataSource> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  return AppDataSource;
}

export async function closeDataSource(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}
