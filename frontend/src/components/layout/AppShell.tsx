import { useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import medoraLogo from '../../assets/medora/medora-horizontal.png';
import { useAuth } from '../../features/auth/AuthContext';
import { hasPermission } from '../../lib/permissions';
import { Button } from '../ui/Button';
import './AppShell.css';

interface NavItem {
  to: string;
  label: string;
  permission: string | null;
  icon: ReactNode;
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h7v7H4V4zm9 0h7v4h-7V4zM4 13h7v7H4v-7zm9 6h7v-9h-7v9z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11zM8 12a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 8 12zm8 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zM8 14c-.35 0-.73.02-1.12.05C4.84 14.4 2 15.47 2 17.5V19h6v-2c0-.7.2-1.33.54-1.9C8.36 14.1 8.18 14 8 14z"
      />
    </svg>
  );
}

function RolesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"
      />
    </svg>
  );
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', permission: null, icon: <DashboardIcon /> },
  { to: '/users', label: 'User Management', permission: 'users.view', icon: <UsersIcon /> },
  { to: '/roles', label: 'Role Management', permission: 'roles.view', icon: <RolesIcon /> },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const visibleNav = navItems.filter(
    (item) => !item.permission || hasPermission(user, item.permission),
  );

  return (
    <div
      className={`app-shell ${sidebarExpanded ? 'is-sidebar-expanded' : 'is-sidebar-collapsed'}`}
    >
      <aside className="app-shell__sidebar">
        <div className="app-shell__sidebar-top">
          <div className="app-shell__sidebar-mark" title="Medora">
            <img src="/assets/logos/medora-icon.png" alt="" />
          </div>
        </div>

        <nav className="app-shell__nav" aria-label="Main">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={item.label}
              className={({ isActive }) =>
                `app-shell__nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              <span className="app-shell__nav-icon">{item.icon}</span>
              <span className="app-shell__nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header">
          <div className="app-shell__header-left">
            <button
              type="button"
              className="app-shell__menu-btn"
              onClick={() => setSidebarExpanded((open) => !open)}
              aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={sidebarExpanded}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="16"
                  rx="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path d="M9 4v16" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <rect x="5" y="7" width="2.4" height="10" rx="1.1" fill="currentColor" />
              </svg>
            </button>
            <img src={medoraLogo} alt="Medora" className="app-shell__header-logo" />
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
