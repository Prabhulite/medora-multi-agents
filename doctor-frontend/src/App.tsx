import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy } from 'react';
import { AuthProvider } from '../../frontend/src/features/auth/AuthContext';
import { LoginPage } from '../../frontend/src/features/auth/LoginPage';
import { ProtectedRoute } from '../../frontend/src/routes/ProtectedRoute';
import { DoctorFrontend } from './DoctorFrontend';
import { DoctorPrescriptionsPage } from './DoctorPrescriptionsPage';
import { DoctorWorkspacePage } from '../../frontend/src/features/doctors/DoctorWorkspacePage';

const AccountSecurityPage = lazy(() => import('../../frontend/src/features/auth/AccountSecurityPage').then((module) => ({ default: module.AccountSecurityPage })));
const NotificationsPage = lazy(() => import('../../frontend/src/features/notifications/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const PatientDashboardPage = lazy(() => import('../../frontend/src/features/patients/PatientDashboardPage').then((module) => ({ default: module.PatientDashboardPage })));

export default function DoctorApp() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="doctor" element={<DoctorFrontend />}>
        <Route index element={<DoctorWorkspacePage doctorPortal />} />
        <Route path="prescriptions" element={<DoctorPrescriptionsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="security" element={<AccountSecurityPage />} />
        <Route element={<ProtectedRoute permission="patients.view" />}><Route path="patients/:id" element={<PatientDashboardPage />} /></Route>
        <Route path="*" element={<Navigate to="/doctor" replace />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/doctor" replace />} />
  </Routes></BrowserRouter></AuthProvider>;
}
