import { Suspense, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import medoraLogo from '../../assets/medora/medora-horizontal.png';
import { useAuth } from '../../features/auth/AuthContext';
import { getMenuIcon } from '../../features/menus/menuIcons';
import { menusApi } from '../../features/menus/menus.api';
import { notificationsApi } from '../../features/notifications/notifications.api';
import { hasPermission } from '../../lib/permissions';
import type { MenuItem } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PatientSearchField } from '../ui/PatientSearchField';
import './AppShell.css';

function isRouteActive(pathname: string, route: string) {
  if (route === '/') return pathname === '/';
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function AppShell() {
  const { user, logout, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canSearchPatients = hasPermission(user, 'patients.view');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [navMenus, setNavMenus] = useState<MenuItem[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
  const [menuSearch, setMenuSearch] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => { void notificationsApi.list().then((data) => { if (active) setUnreadNotifications(data.unreadCount); }).catch(() => undefined); };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('medora:notifications-updated', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('medora:notifications-updated', refresh); };
  }, [user?.id]);

  useEffect(() => {
    let active = true;

    // Keep AuthContext permissions in sync with nav (new menus/permissions after seed).
    void refreshProfile();

    menusApi
      .listNav()
      .then((menus) => {
        if (active) setNavMenus(menus);
      })
      .catch(() => {
        if (active) setNavMenus([]);
      });

    return () => {
      active = false;
    };
  }, [user?.id, refreshProfile]);

  const searchQuery = menuSearch.trim().toLowerCase();

  const childrenByParent = useMemo(() => {
    const map = new Map<number, MenuItem[]>();
    for (const menu of navMenus) {
      if (!menu.parentId) continue;
      const list = map.get(menu.parentId) || [];
      list.push(menu);
      map.set(menu.parentId, list);
    }
    return map;
  }, [navMenus]);

  const rootMenus = useMemo(() => {
    const roots = navMenus.filter((menu) => !menu.parentId);
    if (!searchQuery) return roots;

    return roots.filter((parent) => {
      const children = childrenByParent.get(parent.id) || [];
      if (parent.label.toLowerCase().includes(searchQuery)) return true;
      return children.some((child) => child.label.toLowerCase().includes(searchQuery));
    });
  }, [childrenByParent, navMenus, searchQuery]);

  const visibleChildrenByParent = useMemo(() => {
    if (!searchQuery) return childrenByParent;

    const map = new Map<number, MenuItem[]>();
    for (const [parentId, children] of childrenByParent.entries()) {
      const parent = navMenus.find((menu) => menu.id === parentId);
      const parentMatches = Boolean(parent?.label.toLowerCase().includes(searchQuery));
      const filtered = parentMatches
        ? children
        : children.filter((child) => child.label.toLowerCase().includes(searchQuery));
      if (filtered.length) map.set(parentId, filtered);
    }
    return map;
  }, [childrenByParent, navMenus, searchQuery]);

  useEffect(() => {
    const next: Record<number, boolean> = {};
    for (const parent of rootMenus) {
      const children = visibleChildrenByParent.get(parent.id) || [];
      if (!children.length) continue;
      if (searchQuery) {
        next[parent.id] = true;
        continue;
      }
      next[parent.id] = children.some((child) => isRouteActive(location.pathname, child.route));
    }
    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [location.pathname, rootMenus, searchQuery, visibleChildrenByParent]);

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
  };

  const toggleGroup = (id: number) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div
      className={`app-shell ${sidebarExpanded ? 'is-sidebar-expanded' : 'is-sidebar-collapsed'}`}
    >
      <aside className="app-shell__sidebar">
        <div className="app-shell__sidebar-top">
          <div className="app-shell__sidebar-mark" title="Medora">
            <img src="/assets/logos/medora-icon.png" alt="" />
          </div>
          {sidebarExpanded ? (
            <label className="app-shell__menu-search">
              <span className="app-shell__menu-search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                  />
                </svg>
              </span>
              <input
                type="search"
                value={menuSearch}
                onChange={(event) => setMenuSearch(event.target.value)}
                placeholder="Search menu..."
                aria-label="Search menu"
              />
            </label>
          ) : (
            <button
              type="button"
              className="app-shell__menu-search-btn"
              title="Search menu"
              aria-label="Search menu"
              onClick={() => setSidebarExpanded(true)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
            </button>
          )}
        </div>

        <nav className="app-shell__nav" aria-label="Main">
          {rootMenus.map((item) => {
            const children = visibleChildrenByParent.get(item.id) || [];
            if (!children.length) {
              return (
                <NavLink
                  key={item.id}
                  to={item.route}
                  end={item.route === '/'}
                  title={item.label}
                  className={({ isActive }) =>
                    `app-shell__nav-link ${isActive ? 'is-active' : ''}`
                  }
                >
                  <span className="app-shell__nav-icon">{getMenuIcon(item.icon)}</span>
                  <span className="app-shell__nav-label">{item.label}</span>
                </NavLink>
              );
            }

            const groupOpen = Boolean(openGroups[item.id]);
            const groupActive = children.some((child) =>
              isRouteActive(location.pathname, child.route),
            );

            return (
              <div key={item.id} className={`app-shell__nav-group ${groupOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className={`app-shell__nav-link app-shell__nav-group-toggle ${groupActive ? 'is-active' : ''}`}
                  title={item.label}
                  aria-expanded={groupOpen}
                  onClick={() => toggleGroup(item.id)}
                >
                  <span className="app-shell__nav-icon">{getMenuIcon(item.icon)}</span>
                  <span className="app-shell__nav-label">{item.label}</span>
                  <span className="app-shell__nav-caret" aria-hidden="true">
                    ▾
                  </span>
                </button>

                {groupOpen ? (
                  <div className="app-shell__nav-children">
                    {children.map((child) => (
                      <NavLink
                        key={child.id}
                        to={child.route}
                        title={child.label}
                        className={({ isActive }) =>
                          `app-shell__nav-link app-shell__nav-link--child ${isActive ? 'is-active' : ''}`
                        }
                      >
                        <span className="app-shell__nav-icon">{getMenuIcon(child.icon)}</span>
                        <span className="app-shell__nav-label">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          {searchQuery && !rootMenus.length ? (
            <p className="app-shell__menu-empty">No menu found</p>
          ) : null}
        </nav>

        <div className="app-shell__sidebar-footer">
          {sidebarExpanded ? (
            <div className="app-shell__user-meta">
              <strong title={user?.fullName}>{user?.fullName}</strong>
              <span title={user?.roleCodes.join(', ') || 'User'}>
                {user?.roleCodes.join(', ') || 'User'}
              </span>
            </div>
          ) : null}
          <NavLink to="/account/security" className="app-shell__logout-btn" title="Account security" aria-label="Account security">{sidebarExpanded ? 'Account security' : '🔒'}</NavLink>
          <button
            type="button"
            className="app-shell__logout-btn"
            onClick={() => setLogoutConfirmOpen(true)}
            title="Logout"
            aria-label="Logout"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z"
              />
            </svg>
            {sidebarExpanded ? <span>Logout</span> : null}
          </button>
        </div>
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
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <img src={medoraLogo} alt="Medora" className="app-shell__header-logo" />
          </div>
          <div className="app-shell__header-right">
            {canSearchPatients && <PatientSearchField required={false} label="Patient" onSelect={(patient) => navigate(`/patients/${patient.id}`)} />}
            <NavLink to="/notifications" className="app-shell__notification-link">Notifications {unreadNotifications > 0 && <span>{unreadNotifications}</span>}</NavLink>
          </div>
        </header>

        <main className="app-shell__content">
          <Suspense fallback={<div className="app-shell__loading" role="status">Loading page...</div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirm logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        tone="danger"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
