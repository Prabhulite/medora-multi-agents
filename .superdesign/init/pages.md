# Page Dependency Trees

## `/` Dashboard
Entry: `frontend/src/features/dashboard/DashboardPage.tsx`
Shared shell: `frontend/src/components/layout/AppShell.tsx`

## `/users` User Management
Entry: `frontend/src/features/users/UsersPage.tsx`
Dependencies: PageHeader, Table, Button, Badge, Alert, ActionMenu, statusIcons, Users API, UsersPage.css.

## `/doctors` Doctor Master
Entry: `frontend/src/features/doctors/DoctorsPage.tsx`
Dependencies: PageHeader, Table, Button, Badge, Alert, Modal, ActionMenu, DocumentUploadField, statusIcons, Doctors API, DoctorsPage.css.

## `/specializations` Specialization Master
Entry: `frontend/src/features/specializations/SpecializationsPage.tsx`
Dependencies: PageHeader, Table, Button, Badge, Alert, ActionMenu, statusIcons, Specializations API.

## `/login` Login
Entry: `frontend/src/features/auth/LoginPage.tsx`
Dependencies: auth context, Input, Button, Alert, Medora brand assets, login styling.
