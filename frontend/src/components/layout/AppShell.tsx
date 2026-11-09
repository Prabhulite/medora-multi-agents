import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import medoraLogo from '../../assets/medora/medora-horizontal.png';
import { useAuth } from '../../features/auth/AuthContext';
import { getMenuIcon } from '../../features/menus/menuIcons';
import { menusApi } from '../../features/menus/menus.api';
import type { MenuItem } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import './AppShell.css';

function isRouteActive(pathname: string, route: string) {
  if (route === '/') return pathname === '/';
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [navMenus, setNavMenus] = useState<MenuItem[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let active = true;

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
  }, [user?.id]);

  const rootMenus = useMemo(
    () => navMenus.filter((menu) => !menu.parentId),
    [navMenus],
  );

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

  useEffect(() => {
    const next: Record<number, boolean> = {};
    for (const parent of rootMenus) {
      const children = childrenByParent.get(parent.id) || [];
      if (!children.length) continue;
      next[parent.id] = children.some((child) => isRouteActive(location.pathname, child.route));
    }
    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [childrenByParent, location.pathname, rootMenus]);

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
        </div>

        <nav className="app-shell__nav" aria-label="Main">
          {rootMenus.map((item) => {
            const children = childrenByParent.get(item.id) || [];
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
        </header>

        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>

      <Modal
        open={logoutConfirmOpen}
        title="Confirm logout"
        size="sm"
        squared
        onClose={() => setLogoutConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={confirmLogout}>
              Logout
            </Button>
          </>
        }
      >
        <p>Are you sure you want to logout?</p>
      </Modal>
    </div>
  );
}
