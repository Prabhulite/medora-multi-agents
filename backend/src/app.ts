import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import departmentRoutes from './modules/departments/routes/department.routes.js';
import doctorRoutes from './modules/doctors/routes/doctor.routes.js';
import hospitalProfileRoutes from './modules/hospital-profile/routes/hospital-profile.routes.js';
import menuRoutes from './modules/menus/routes/menu.routes.js';
import roleRoutes from './modules/roles/routes/role.routes.js';
import specializationRoutes from './modules/specializations/routes/specialization.routes.js';
import userRoutes from './modules/users/routes/user.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '5mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Medora API is healthy',
      data: {
        service: 'medora-backend',
        env: env.NODE_ENV,
      },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/specializations', specializationRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/hospital-profile', hospitalProfileRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/menus', menuRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
