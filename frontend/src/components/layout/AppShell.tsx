import { Suspense, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import medoraHorizontalLogo from '../../assets/medora/medora-horizontal.png';
import { useAuth } from '../../features/auth/AuthContext';
import { ChatSidebar } from '../../features/chat/ChatSidebar';
import { getMenuIcon } from '../../features/menus/menuIcons';
import { menusApi } from '../../features/menus/menus.api';
import { notificationsApi } from '../../features/notifications/notifications.api';
import { hasPermission } from '../../lib/permissions';
import type { MenuItem } from '../../types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { PageLoader } from '../ui/Loader';
import { PatientSearchField } from '../ui/PatientSearchField';
import './AppShell.css';

function isRouteActive(pathname: string, route: string) {
  if (route === '/') return pathname === '/';
  return pathname === route || pathname.startsWith(`${route}/`);
}

const clinicalNavigation = [
  { route: '/patients', label: 'Patients' },
  { route: '/vaccination', label: 'Vaccination' },
  { route: '/inpatient', label: 'Inpatient & Beds' },
  { route: '/checkin', label: 'OPD Queue' },
  { route: '/emergency', label: 'Emergency (ER)' },
  { route: '/nursing', label: 'Nursing Station' },
  { route: '/surgery', label: 'Operation Theatre' },
  { route: '/laboratory', label: 'Laboratory (LIS)' },
  { route: '/radiology', label: 'Radiology (RIS)' },
  { route: '/pharmacy', label: 'Pharmacy POS' },
  { route: '/my-practice', label: 'Clinic' },
  { route: '/appointments', label: 'Appointments' },
  { route: '/calendar', label: 'Calendar' },
  { route: '/prescriptions', label: 'Prescriptions' },
  { route: '/chat', label: 'Chat' },
] as const;

const clinicalRoutes = new Set<string>(clinicalNavigation.map((item) => item.route));

const managementNavigation = [
  { route: '/billing', label: 'Hospital Cashier', permission: 'billing.view' },
  { route: '/pharmacy', label: 'Inventory Mgmt', permission: 'pharmacy.inventory.view' },
  { route: '/suppliers', label: 'Suppliers', permission: 'pharmacy.procurement.view' },
  { route: '/expenses', label: 'Activities & Expenses', permission: 'expenses.view' },
  { route: '/fixed-assets', label: 'Fixed Assets', permission: 'fixed_assets.view' },
  { route: '/automation', label: 'Automation', permission: '' },
  { route: '/reports', label: 'Reports', permission: 'operations.view' },
] as const;
const managementRoutes = new Set<string>(managementNavigation.map((item) => item.route));

const clinicalIconPaths: Record<string, string> = {
  '/vaccination': 'M12 2v20M2 12h20',
  '/patients': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-17a4 4 0 0 1 0 8m6 9v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  '/inpatient': 'M3 3v18m0-6h18v6m0-6V9a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v6m0-3h14',
  '/nursing': 'M20 8a4 4 0 0 0-8-1 4 4 0 0 0-8 1c0 5 8 11 8 11s8-6 8-11ZM4 12h4l2-3 3 6 2-3h5',
  '/checkin': 'M3 11h4l9-5v12l-9-5H3v-2Zm13-3a5 5 0 0 1 0 8M7 13l2 7h3',
  '/emergency': 'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M9 16v-4a3 3 0 0 1 6 0v4m-8 0h10M8 20h8',
  '/surgery': 'M4 20 20 4M7 4l13 13M4 4l4 4m8 8 4 4M3 17l4 4m10-18 4 4',
  '/laboratory': 'M9 3h6m-5 0v7l-6 10h16l-6-10V3M7 16h10',
  '/radiology': 'M7 3H5a2 2 0 0 0-2 2v2m14-4h2a2 2 0 0 1 2 2v2M3 17v2a2 2 0 0 0 2 2h2m14-4v2a2 2 0 0 1-2 2h-2',
  '/pharmacy': 'M4 7h16l-1 13H5L4 7Zm-1-4h18M9 11h6m-3-3v6',
  '/my-practice': 'M3 20V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v15M3 20h18M12 7v8m-4-4h8',
  '/doctors': 'M3 20V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v15M3 20h18M12 7v8m-4-4h8',
  '/appointments': 'M7 2v4m10-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 9h2m3 0h2m-7 3h2',
  '/calendar': 'M7 2v4m10-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 5h12',
  '/prescriptions': 'M7 3h10l4 4v14H3V3h4Zm2 6h6m-6 4h8m-8 4h5',
  '/chat': 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z',
};

function ClinicalIcon({ route }: { route: string }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={clinicalIconPaths[route]} /></svg>;
}

export function AppShell() {
  const { user, logout, refreshProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canSearchPatients = hasPermission(user, 'patients.view');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [navMenus, setNavMenus] = useState<MenuItem[]>([]);
  const pageTitle = location.pathname === '/' ? 'Dashboard' :
    [...clinicalNavigation].find((item) => isRouteActive(location.pathname, item.route))?.label ??
    [...managementNavigation].find((item) => isRouteActive(location.pathname, item.route))?.label ??
    (location.pathname === '/support-tickets' ? 'Raise Ticket' : undefined) ??
    navMenus.find((item) => isRouteActive(location.pathname, item.route))?.label ?? 'Medora';
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
      if (clinicalRoutes.has(menu.route) || managementRoutes.has(menu.route)) continue;
      if (!menu.parentId) continue;
      const list = map.get(menu.parentId) || [];
      list.push(menu);
      map.set(menu.parentId, list);
    }
    return map;
  }, [navMenus]);

  const rootMenus = useMemo(() => {
    const roots = navMenus.filter((menu) => !menu.parentId && !clinicalRoutes.has(menu.route) && !managementRoutes.has(menu.route));
    if (!searchQuery) return roots;

    return roots.filter((parent) => {
      const children = childrenByParent.get(parent.id) || [];
      if (parent.label.toLowerCase().includes(searchQuery)) return true;
      return children.some((child) => child.label.toLowerCase().includes(searchQuery));
    });
  }, [childrenByParent, navMenus, searchQuery]);

  const clinicalMenus = useMemo(() => clinicalNavigation.flatMap(({ route, label }) => {
    const destination = route === '/my-practice' && user?.isSuperAdmin ? '/doctors' : route;
    const menu = navMenus.find((item) => item.route === destination || (route === '/calendar' && item.route === '/appointments') || (route === '/nursing' && item.route === '/inpatient') || (route === '/prescriptions' && item.route === '/patients'));
    if (route === '/chat' && user && (!searchQuery || label.toLowerCase().includes(searchQuery))) return [{ id: -1, route, label, icon: 'menus' } as MenuItem];
    return menu && (!searchQuery || label.toLowerCase().includes(searchQuery) || menu.label.toLowerCase().includes(searchQuery))
      ? [{ ...menu, route: destination, label }]
      : [];
  }), [navMenus, searchQuery, user]);

  const managementMenus = managementNavigation.filter(({ label, permission }) => (permission === '' || hasPermission(user, permission)) && (!searchQuery || label.toLowerCase().includes(searchQuery)));

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
      className={`app-shell ${sidebarExpanded ? 'is-sidebar-expanded' : 'is-sidebar-collapsed'} ${location.pathname.startsWith('/patients') ? 'is-patients-page' : ''}`}
    >
      <aside className="app-shell__sidebar">
        <div className="app-shell__sidebar-top">
          <div className="app-shell__sidebar-mark" title="Medora">
            <img src={medoraHorizontalLogo} alt="" />
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
          {(!searchQuery || 'main'.includes(searchQuery)) && <span className="app-shell__nav-heading">Main</span>}
          {rootMenus.filter((item) => item.route === '/').map((item) => <NavLink key={item.id} to={item.route} end title={item.label} className={({ isActive }) => `app-shell__nav-link ${isActive ? 'is-active' : ''}`}><span className="app-shell__nav-icon">{getMenuIcon(item.icon)}</span><span className="app-shell__nav-label">{item.label}</span></NavLink>)}
          {clinicalMenus.length > 0 && <><span className="app-shell__nav-heading">Clinical</span>{clinicalMenus.map((item) => <NavLink key={item.route} to={item.route} title={item.label} className={({ isActive }) => `app-shell__nav-link ${isActive ? 'is-active' : ''}`}><span className="app-shell__nav-icon"><ClinicalIcon route={item.route} /></span><span className="app-shell__nav-label">{item.label}</span></NavLink>)}</>}
          {(rootMenus.some((item) => item.route !== '/') || managementMenus.length > 0) && <span className="app-shell__nav-heading">Management</span>}
          {managementMenus.map((item) => <NavLink key={item.route} to={item.route} title={item.label} className={({ isActive }) => `app-shell__nav-link ${isActive ? 'is-active' : ''}`}><span className="app-shell__nav-icon">{getMenuIcon(item.route === '/billing' ? 'menus' : item.route === '/reports' ? 'dashboard' : item.route === '/suppliers' ? 'front_office' : 'hospital')}</span><span className="app-shell__nav-label">{item.label}</span></NavLink>)}
          {rootMenus.filter((item) => item.route !== '/').map((item) => {
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
                    â–¾
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
          {searchQuery && !rootMenus.length && !clinicalMenus.length && !managementMenus.length ? (
            <p className="app-shell__menu-empty">No menu found</p>
          ) : null}
          {user && (!searchQuery || 'raise ticket'.includes(searchQuery)) && <><span className="app-shell__nav-heading">Account</span><NavLink to="/support-tickets" className={({ isActive }) => `app-shell__nav-link ${isActive ? 'is-active' : ''}`}><span className="app-shell__nav-icon">{getMenuIcon('menus')}</span><span className="app-shell__nav-label">Raise Ticket</span></NavLink></>}
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
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <strong className="app-shell__page-title">{pageTitle}</strong>
          </div>
          <div className="app-shell__header-right">
            {canSearchPatients ? (
              <PatientSearchField
                required={false}
                label=""
                onSelect={(patient) => navigate(`/patients/${patient.id}`)}
              />
            ) : null}
            <button type="button" onClick={() => setChatOpen(true)} className="app-shell__notification-btn" aria-label="Staff chat" title="Staff chat">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z" /></svg>
            </button>
            <NavLink
              to="/notifications"
              className="app-shell__notification-btn"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications, ${unreadNotifications} unread`
                  : 'Notifications'
              }
              title="Notifications"
            >
              <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.2 9.8a5.8 5.8 0 0 1 11.6 0c0 4.1 1.4 5.3 1.4 5.3H4.8s1.4-1.2 1.4-5.3Z"
                />
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 18.4a2 2 0 0 0 4 0"
                />
              </svg>
              {unreadNotifications > 0 ? (
                <span className="app-shell__notification-badge">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              ) : null}
            </NavLink>
            <details className="app-shell__account-menu">
              <summary className="app-shell__avatar" title={user?.fullName || 'Account menu'} aria-label="Account menu">{(user?.fullName || 'M').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</summary>
              <div className="app-shell__account-popover">
                <strong>{user?.fullName}</strong>
                <span>{user?.roleCodes.join(', ') || 'User'}</span>
                <NavLink to="/account/security">Account security</NavLink>
                <button type="button" onClick={() => setLogoutConfirmOpen(true)}>Logout</button>
              </div>
            </details>
          </div>
        </header>

        <main className="app-shell__content">
          <Suspense
            fallback={
              <div className="app-shell__loading">
                <PageLoader label="Loading pageâ€¦" />
              </div>
            }
          >
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
      <ChatSidebar open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
