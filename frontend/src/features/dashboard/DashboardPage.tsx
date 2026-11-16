import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { hasPermission } from '../../lib/permissions';
import { PageHeader } from '../../components/ui/PageHeader';
import './DashboardPage.css';

export function DashboardPage() {
  const { user } = useAuth();

  const cards = [
    {
      title: 'User Management',
      description: 'Create users and assign roles dynamically.',
      to: '/users',
      permission: 'users.view',
    },
    {
      title: 'Role Management',
      description: 'Configure roles and permission mappings from the database.',
      to: '/roles',
      permission: 'roles.view',
    },
    {
      title: 'Menu Management',
      description: 'Manage sidebar menus, routes, and access from the database.',
      to: '/menus',
      permission: 'menus.view',
    },
  ].filter((card) => hasPermission(user, card.permission));

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName || 'Admin'}`}
        subtitle="Medora administration workspace powered by role-based access control."
      />

      <section className="dashboard-overview" aria-label="Today's overview">
        <div className="dashboard-overview__intro">
          <span className="dashboard-eyebrow">Today at a glance</span>
          <h2>Your workspace is ready</h2>
          <p>Live operational data will appear here once it is connected.</p>
        </div>
        <div className="dashboard-empty-state">
          <span aria-hidden="true">✦</span>
          <div>
            <strong>No live data yet</strong>
            <small>Connect your hospital data source to populate this overview.</small>
          </div>
        </div>
      </section>

      <div className="dashboard-secondary-grid">
        <section className="dashboard-panel dashboard-panel--schedule" aria-labelledby="schedule-title">
          <div className="dashboard-panel__header">
            <div>
              <span className="dashboard-eyebrow">Schedule</span>
              <h2 id="schedule-title">Next on your calendar</h2>
            </div>
            <span className="dashboard-panel__date">Tue, 16 Nov</span>
          </div>
          <div className="dashboard-empty-panel">
            <strong>No upcoming events</strong>
            <span>Appointments and tasks will appear here when available.</span>
          </div>
        </section>

        <section className="dashboard-panel dashboard-panel--actions" aria-labelledby="actions-title">
          <div className="dashboard-panel__header">
            <div>
              <span className="dashboard-eyebrow">Quick actions</span>
              <h2 id="actions-title">Start with what matters</h2>
            </div>
          </div>
          <div className="dashboard-empty-panel">
            <strong>No quick actions configured</strong>
            <span>Available actions will appear here based on your permissions.</span>
          </div>
        </section>
      </div>

      <div className="dashboard-section-heading">
        <div>
          <span className="dashboard-eyebrow">Workspace</span>
          <h2>Administration modules</h2>
        </div>
        <span>{cards.length} available to you</span>
      </div>
      <div className="dashboard-grid">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="dashboard-card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <span>Open module →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
