import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { AuthProvider } from '../features/auth/AuthContext';
import { LoginPage } from '../features/auth/LoginPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { MenusPage } from '../features/menus/MenusPage';
import { RoleFormPage } from '../features/roles/RoleFormPage';
import { RolesPage } from '../features/roles/RolesPage';
import { DepartmentFormPage } from '../features/departments/DepartmentFormPage';
import { DepartmentsPage } from '../features/departments/DepartmentsPage';
import { DoctorFormPage } from '../features/doctors/DoctorFormPage';
import { DoctorsPage } from '../features/doctors/DoctorsPage';
import { HospitalProfilePage } from '../features/hospital-profile/HospitalProfilePage';
import { SpecializationFormPage } from '../features/specializations/SpecializationFormPage';
import { SpecializationsPage } from '../features/specializations/SpecializationsPage';
import { UserFormPage } from '../features/users/UserFormPage';
import UsersPage from '../features/users/UsersPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
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
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
