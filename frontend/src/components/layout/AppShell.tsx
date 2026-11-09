import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { hasPermission } from '../../lib/permissions';
import { Button } from '../ui/Button';
import './AppShell.css';

const navItems = [
  { to: '/', label: 'Dashboard', permission: null },
  { to: '/users', label: 'User Management', permission: 'users.view' },
  { to: '/roles', label: 'Role Management', permission: 'roles.view' },
];

export function AppShell() {
  const { user, logout } = useAuth();

  const visibleNav = navItems.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  );

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__brand">
          <img src="/assets/logos/medora-icon.png" alt="Medora" />
          <div>
            <strong>MEDORA</strong>
            <span>CARE • CONNECT • CURE</span>
          </div>
        </div>

        <nav className="app-shell__nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `app-shell__nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header">
          <div>
            <p className="app-shell__eyebrow">Hospital Management System</p>
            <h2>Administration</h2>
          </div>
          <div className="app-shell__user">
            <div>
              <strong>{user?.fullName}</strong>
              <span>{user?.roleCodes.join(', ') || 'User'}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
