import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { AuthProvider } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';

const AccountSecurityPage = lazy(() => import('../features/auth/AccountSecurityPage').then((module) => ({ default: module.AccountSecurityPage })));
const MenusPage = lazy(() => import('../features/menus/MenusPage').then((module) => ({ default: module.MenusPage })));
const RoleFormPage = lazy(() => import('../features/roles/RoleFormPage').then((module) => ({ default: module.RoleFormPage })));
const RolesPage = lazy(() => import('../features/roles/RolesPage').then((module) => ({ default: module.RolesPage })));
const DepartmentFormPage = lazy(() => import('../features/departments/DepartmentFormPage').then((module) => ({ default: module.DepartmentFormPage })));
const DepartmentsPage = lazy(() => import('../features/departments/DepartmentsPage').then((module) => ({ default: module.DepartmentsPage })));
const ServiceFormPage = lazy(() => import('../features/services/ServiceFormPage').then((module) => ({ default: module.ServiceFormPage })));
const ServicesPage = lazy(() => import('../features/services/ServicesPage').then((module) => ({ default: module.ServicesPage })));
const DoctorFormPage = lazy(() => import('../features/doctors/DoctorFormPage').then((module) => ({ default: module.DoctorFormPage })));
const DoctorAccountPage = lazy(() => import('../features/doctors/DoctorAccountPage').then((module) => ({ default: module.DoctorAccountPage })));
const DoctorsPage = lazy(() => import('../features/doctors/DoctorsPage').then((module) => ({ default: module.DoctorsPage })));
const HospitalProfilePage = lazy(() => import('../features/hospital-profile/HospitalProfilePage').then((module) => ({ default: module.HospitalProfilePage })));
const AppointmentFormPage = lazy(() => import('../features/appointments/AppointmentFormPage').then((module) => ({ default: module.AppointmentFormPage })));
const AppointmentsPage = lazy(() => import('../features/appointments/AppointmentsPage').then((module) => ({ default: module.AppointmentsPage })));
const CheckinPage = lazy(() => import('../features/checkin/CheckinPage').then((module) => ({ default: module.CheckinPage })));
const CheckinListPage = lazy(() => import('../features/checkin/CheckinListPage').then((module) => ({ default: module.CheckinListPage })));
const QuickOpBillPage = lazy(() => import('../features/checkin/QuickOpBillPage').then((module) => ({ default: module.QuickOpBillPage })));
const PatientDashboardPage = lazy(() => import('../features/patients/PatientDashboardPage').then((module) => ({ default: module.PatientDashboardPage })));
const PatientFormPage = lazy(() => import('../features/patients/PatientFormPage').then((module) => ({ default: module.PatientFormPage })));
const PatientsPage = lazy(() => import('../features/patients/PatientsPage').then((module) => ({ default: module.PatientsPage })));
const SpecializationFormPage = lazy(() => import('../features/specializations/SpecializationFormPage').then((module) => ({ default: module.SpecializationFormPage })));
const SpecializationsPage = lazy(() => import('../features/specializations/SpecializationsPage').then((module) => ({ default: module.SpecializationsPage })));
const UserFormPage = lazy(() => import('../features/users/UserFormPage').then((module) => ({ default: module.UserFormPage })));
const UsersPage = lazy(() => import('../features/users/UsersPage'));
const InpatientDashboardPage = lazy(() => import('../features/inpatient/InpatientDashboardPage').then((module) => ({ default: module.InpatientDashboardPage })));
const BillingDashboardPage = lazy(() => import('../features/billing/BillingDashboardPage').then((module) => ({ default: module.BillingDashboardPage })));
const EmergencyPage = lazy(() => import('../features/emergency/EmergencyPage').then((module) => ({ default: module.EmergencyPage })));
const SurgeryPage = lazy(() => import('../features/surgery/SurgeryPage').then((module) => ({ default: module.SurgeryPage })));
const RosterPage = lazy(() => import('../features/roster/RosterPage').then((module) => ({ default: module.RosterPage })));
const AmbulancePage = lazy(() => import('../features/ambulance/AmbulancePage').then((module) => ({ default: module.AmbulancePage })));
const BloodBankPage = lazy(() => import('../features/blood-bank/BloodBankPage').then((module) => ({ default: module.BloodBankPage })));
const NotificationsPage = lazy(() => import('../features/notifications/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const PharmacyInventoryPage = lazy(() => import('../features/pharmacy/PharmacyInventoryPage').then((module) => ({ default: module.PharmacyInventoryPage })));
const PharmacyPurchasingPage = lazy(() => import('../features/pharmacy/PharmacyPurchasingPage').then((module) => ({ default: module.PharmacyPurchasingPage })));
const LaboratoryDiagnosticsPage = lazy(() => import('../features/laboratory/LaboratoryDiagnosticsPage').then((module) => ({ default: module.LaboratoryDiagnosticsPage })));
const RadiologyDiagnosticsPage = lazy(() => import('../features/radiology/RadiologyDiagnosticsPage').then((module) => ({ default: module.RadiologyDiagnosticsPage })));
const OperationsDashboardPage = lazy(() => import('../features/operations/OperationsDashboardPage').then((module) => ({ default: module.OperationsDashboardPage })));
const AuditLogsPage = lazy(() => import('../features/audit/AuditLogsPage').then((module) => ({ default: module.AuditLogsPage })));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="account/security" element={<AccountSecurityPage />} />
              <Route element={<ProtectedRoute permission="hospital_profile.view" />}>
                <Route path="hospital-profile" element={<HospitalProfilePage />} />
              </Route>
              <Route element={<ProtectedRoute permission="users.view" />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="users.create" />}>
                <Route path="users/new" element={<UserFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="users.update" />}>
                <Route path="users/:id/edit" element={<UserFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="departments.view" />}>
                <Route path="departments" element={<DepartmentsPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="departments.create" />}>
                <Route path="departments/new" element={<DepartmentFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="departments.update" />}>
                <Route path="departments/:id/edit" element={<DepartmentFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="services.view" />}>
                <Route path="services" element={<ServicesPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="services.create" />}>
                <Route path="services/new" element={<ServiceFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="services.update" />}>
                <Route path="services/:id/edit" element={<ServiceFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="specializations.view" />}>
                <Route path="specializations" element={<SpecializationsPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="specializations.create" />}>
                <Route path="specializations/new" element={<SpecializationFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="specializations.update" />}>
                <Route path="specializations/:id/edit" element={<SpecializationFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="doctors.view" />}>
                <Route path="doctors" element={<DoctorsPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="doctors.create" />}>
                <Route path="doctors/new" element={<DoctorFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="doctors.update" />}>
                <Route path="doctors/:id/edit" element={<DoctorFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="doctors.account_link" />}>
                <Route path="doctors/:id/account" element={<DoctorAccountPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="patients.view" />}>
                <Route path="patients" element={<PatientsPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="patients.create" />}>
                <Route path="patients/new" element={<PatientFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="patients.update" />}>
                <Route path="patients/:id/edit" element={<PatientFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="patients.view" />}>
                <Route path="patients/:id" element={<PatientDashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="appointments.view" />}>
                <Route path="appointments" element={<AppointmentsPage />} />
              </Route>
              <Route
                element={
                  <ProtectedRoute permissions={['visits.view', 'visits.checkin', 'visits.checkout']} />
                }
              >
                <Route path="checkin" element={<CheckinListPage />} />
                <Route path="checkin-list" element={<Navigate to="/checkin" replace />} />
              </Route>
              <Route element={<ProtectedRoute permission="visits.checkin" />}>
                <Route path="checkin/new" element={<CheckinPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="billing.create" />}>
                <Route path="checkin/:visitId/bill" element={<QuickOpBillPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="inpatient.view" />}>
                <Route path="inpatient" element={<InpatientDashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="billing.view" />}>
                <Route path="billing" element={<BillingDashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="emergency.view" />}>
                <Route path="emergency" element={<EmergencyPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="surgery.view" />}>
                <Route path="surgery" element={<SurgeryPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="roster.view" />}>
                <Route path="roster" element={<RosterPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="ambulance.view" />}>
                <Route path="ambulance" element={<AmbulancePage />} />
              </Route>
              <Route element={<ProtectedRoute permission="blood_bank.view" />}>
                <Route path="blood-bank" element={<BloodBankPage />} />
              </Route>
              <Route path="notifications" element={<NotificationsPage />} />
              <Route element={<ProtectedRoute permission="pharmacy.inventory.view" />}>
                <Route path="pharmacy" element={<PharmacyInventoryPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="pharmacy.procurement.view" />}>
                <Route path="pharmacy/procurement" element={<PharmacyPurchasingPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="laboratory.view" />}>
                <Route path="laboratory" element={<LaboratoryDiagnosticsPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="radiology.view" />}>
                <Route path="radiology" element={<RadiologyDiagnosticsPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="operations.view" />}>
                <Route path="operations" element={<OperationsDashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="audit.view" />}>
                <Route path="audit-logs" element={<AuditLogsPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="appointments.create" />}>
                <Route path="appointments/new" element={<AppointmentFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="appointments.update" />}>
                <Route path="appointments/:id/reschedule" element={<AppointmentFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="roles.view" />}>
                <Route path="roles" element={<RolesPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="roles.create" />}>
                <Route path="roles/new" element={<RoleFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="roles.update" />}>
                <Route path="roles/:id/edit" element={<RoleFormPage />} />
              </Route>
              <Route element={<ProtectedRoute permission="menus.view" />}>
                <Route path="menus" element={<MenusPage />} />
              </Route>
              {/* Keep catch-all inside the shell so unknown paths don't bypass page routes. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
