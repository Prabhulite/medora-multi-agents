import cors from 'cors';
import express, { type Request } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import appointmentRoutes from './modules/appointments/routes/appointment.routes.js';
import visitRoutes from './modules/visits/routes/visit.routes.js';
import clinicalRoutes from './modules/clinical/routes/clinical.routes.js';
import authRoutes from './modules/auth/routes/auth.routes.js';
import departmentRoutes from './modules/departments/routes/department.routes.js';
import serviceCategoryRoutes from './modules/service-categories/routes/service-category.routes.js';
import serviceRoutes from './modules/services/routes/service.routes.js';
import doctorRoutes from './modules/doctors/routes/doctor.routes.js';
import hospitalProfileRoutes from './modules/hospital-profile/routes/hospital-profile.routes.js';
import menuRoutes from './modules/menus/routes/menu.routes.js';
import patientRoutes from './modules/patients/routes/patient.routes.js';
import prescriptionRoutes from './modules/pharmacy/routes/prescription.routes.js';
import inventoryRoutes from './modules/pharmacy/routes/inventory.routes.js';
import procurementRoutes from './modules/pharmacy/routes/procurement.routes.js';
import laboratoryRoutes from './modules/laboratory/routes/laboratory.routes.js';
import radiologyRoutes from './modules/radiology/routes/radiology.routes.js';
import operationsRoutes from './modules/operations/routes/operations.routes.js';
import auditRoutes from './modules/audit/routes/audit.routes.js';
import inpatientRoutes from './modules/inpatient/routes/inpatient.routes.js';
import billingRoutes from './modules/billing/routes/billing.routes.js';
import emergencyRoutes from './modules/emergency/routes/emergency.routes.js';
import surgeryRoutes from './modules/surgery/routes/surgery.routes.js';
import rosterRoutes from './modules/roster/routes/roster.routes.js';
import ambulanceRoutes from './modules/ambulance/routes/ambulance.routes.js';
import roleRoutes from './modules/roles/routes/role.routes.js';
import specializationRoutes from './modules/specializations/routes/specialization.routes.js';
import userRoutes from './modules/users/routes/user.routes.js';
import { auditRequest } from './middleware/auditRequest.js';
import { rateLimit } from './middleware/rateLimit.js';
import fhirRoutes from './modules/interoperability/routes/fhir.routes.js';
import bloodBankRoutes from './modules/blood-bank/routes/blood-bank.routes.js';
import notificationRoutes from './modules/notifications/routes/notification.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '2mb' }));
  morgan.token('request-path', (req) => (req as Request).path);
  app.use(morgan(':method :request-path :status :res[content-length] - :response-time ms request=:res[x-request-id]'));
  app.use(auditRequest);
  app.use('/api', rateLimit({ windowMs: 60_000, max: env.NODE_ENV === 'test' ? 1000 : 180, keyPrefix: 'api' }));

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

  app.use('/api/auth', rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'auth' }), authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/service-categories', serviceCategoryRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/specializations', specializationRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/visits', visitRoutes);
  app.use('/api/clinical', clinicalRoutes);
  app.use('/api/fhir', fhirRoutes);
  app.use('/api/pharmacy', prescriptionRoutes);
  app.use('/api/pharmacy', inventoryRoutes);
  app.use('/api/pharmacy', procurementRoutes);
  app.use('/api/laboratory', laboratoryRoutes);
  app.use('/api/radiology', radiologyRoutes);
  app.use('/api/operations', operationsRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/inpatient', inpatientRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/emergency', emergencyRoutes);
  app.use('/api/surgery', surgeryRoutes);
  app.use('/api/roster', rosterRoutes);
  app.use('/api/ambulance', ambulanceRoutes);
  app.use('/api/blood-bank', bloodBankRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/hospital-profile', hospitalProfileRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/menus', menuRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
