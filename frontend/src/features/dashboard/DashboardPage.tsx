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
  ].filter((card) => hasPermission(user, card.permission));

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.fullName || 'Admin'}`}
        subtitle="Medora administration workspace powered by role-based access control."
      />

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
