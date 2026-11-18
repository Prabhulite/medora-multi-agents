import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { hasPermission } from '../../lib/permissions';
import { useAuth } from '../auth/AuthContext';
import './DashboardPage.css';

const workspaces = [
  { title: 'My Practice', detail: 'Schedule and patient charts', to: '/my-practice', permission: 'doctors.workspace.view', group: 'Clinical' },
  { title: 'Patients', detail: 'Records and patient history', to: '/patients', permission: 'patients.view', group: 'Clinical' },
  { title: 'Appointments', detail: 'Scheduled visits', to: '/appointments', permission: 'appointments.view', group: 'Clinical' },
  { title: 'Check-in', detail: 'Start a patient visit', to: '/checkin', permission: 'visits.view', group: 'Front office' },
  { title: 'Inpatient', detail: 'Admissions and ward care', to: '/inpatient', permission: 'inpatient.view', group: 'Care operations' },
  { title: 'Laboratory', detail: 'Samples and results', to: '/laboratory', permission: 'laboratory.view', group: 'Care operations' },
  { title: 'Radiology', detail: 'Imaging and reports', to: '/radiology', permission: 'radiology.view', group: 'Care operations' },
  { title: 'Pharmacy', detail: 'Stock and dispensing', to: '/pharmacy', permission: 'pharmacy.inventory.view', group: 'Care operations' },
  { title: 'Billing', detail: 'Invoices and payments', to: '/billing', permission: 'billing.view', group: 'Administration' },
  { title: 'Operations', detail: 'Activity and reports', to: '/operations', permission: 'operations.view', group: 'Administration' },
  { title: 'Users', detail: 'Staff accounts', to: '/users', permission: 'users.view', group: 'Administration' },
  { title: 'Roles', detail: 'Permissions and access', to: '/roles', permission: 'roles.view', group: 'Administration' },
  { title: 'Menus', detail: 'Navigation settings', to: '/menus', permission: 'menus.view', group: 'Administration' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const available = workspaces.filter((item) => hasPermission(user, item.permission));
  return <div className="dashboard-home">
    <PageHeader title={`Welcome, ${user?.fullName || 'Team'}`} subtitle="Choose a workspace to continue your day." />
    {['Clinical', 'Front office', 'Care operations', 'Administration'].map((group) => {
      const items = available.filter((item) => item.group === group);
      return items.length ? <section className="dashboard-home__section" key={group} aria-label={group}>
        <h2>{group}</h2><div className="dashboard-home__links">{items.map((item) => <Link className="dashboard-home__link" key={item.to} to={item.to}>
          <span><strong>{item.title}</strong><small>{item.detail}</small></span><span aria-hidden="true">→</span>
        </Link>)}</div>
      </section> : null;
    })}
    {!available.length ? <p className="dashboard-home__empty">No workspaces are assigned to your account. Ask an administrator to review your role.</p> : null}
  </div>;
}
