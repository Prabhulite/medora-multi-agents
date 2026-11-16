# Route Map

Router: `frontend/src/app/App.tsx`, React Router 7, protected routes inside `AppShell`.

- `/` → DashboardPage
- `/hospital-profile` → HospitalProfilePage
- `/users`, `/users/new`, `/users/:id/edit` → UsersPage / UserFormPage
- `/departments`, `/departments/new`, `/departments/:id/edit` → DepartmentsPage / DepartmentFormPage
- `/specializations`, `/specializations/new`, `/specializations/:id/edit` → SpecializationsPage / SpecializationFormPage
- `/doctors`, `/doctors/new`, `/doctors/:id/edit` → DoctorsPage / DoctorFormPage
- `/patients`, `/patients/new`, `/patients/:id`, `/patients/:id/edit` → patient pages
- `/appointments`, `/appointments/new`, `/appointments/:id/reschedule` → appointment pages
- `/roles`, `/roles/new`, `/roles/:id/edit` → RolesPage / RoleFormPage
- `/menus` → MenusPage
- `/login` → LoginPage

All authenticated routes share AppShell; permissions are enforced by nested ProtectedRoute wrappers.
