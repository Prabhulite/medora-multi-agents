import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import medoraLogo from '../../frontend/src/assets/medora/medora-horizontal.png';
import { useAuth } from '../../frontend/src/features/auth/AuthContext';
import { PatientSearchField } from '../../frontend/src/components/ui/PatientSearchField';
import { PageLoader } from '../../frontend/src/components/ui/Loader';
import { ChatSidebar } from '../../frontend/src/features/chat/ChatSidebar';
import { notificationsApi } from '../../frontend/src/features/notifications/notifications.api';
import { adminPortalUrl } from '../../frontend/src/lib/portal-urls';
import './DoctorFrontend.css';

const titles: Record<string, string> = { '/doctor': 'My patients', '/doctor/prescriptions': 'Prescriptions', '/doctor/notifications': 'Notifications', '/doctor/security': 'Account security' };
const iconPaths = {
  patients: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m14-17a4 4 0 0 1 0 8m6 9v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  rx: 'M7 3h10l4 4v14H3V3h4Zm2 6h6m-6 4h8m-8 4h5',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z',
  security: 'M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5l-8-3Zm-3 10 2 2 4-4',
  bell: 'M6.2 9.8a5.8 5.8 0 0 1 11.6 0c0 4.1 1.4 5.3 1.4 5.3H4.8s1.4-1.2 1.4-5.3ZM10 18.4a2 2 0 0 0 4 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
} as const;
function Icon({ name }: { name: keyof typeof iconPaths }) { return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>; }

export function DoctorFrontend() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => { setMobileNavOpen(false); setProfileOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const refresh = () => { void notificationsApi.list().then((data) => { if (active) setUnread(data.unreadCount); }).catch(() => undefined); };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('medora:notifications-updated', refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('medora:notifications-updated', refresh); };
  }, [user?.id]);
  if (loading) return <PageLoader label="Loading doctor workspace" />;
  if (!user?.roleCodes.includes('physician') || !user.permissions.includes('doctors.workspace.view')) return <div className="doctor-access-denied"><h1>Doctor sign-in required</h1><p>You are signed in as {user?.fullName || 'another account'}. Sign in with a linked physician account to open the doctor workspace.</p><button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Switch to doctor account</button><p><a href={adminPortalUrl}>Open admin portal</a></p></div>;
  const title = location.pathname.startsWith('/doctor/patients/') ? 'Patient chart' : titles[location.pathname] || 'Doctor workspace';
  const initials = user.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <div className="doctor-frontend">
    {mobileNavOpen && <button className="doctor-frontend__scrim" type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
    <aside className={`doctor-frontend__nav ${mobileNavOpen ? 'is-open' : ''}`} aria-label="Doctor navigation">
      <div className="doctor-frontend__brand"><img src={medoraLogo} alt="Medora" /><button type="button" className="doctor-frontend__mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">×</button></div>
      <div className="doctor-frontend__nav-scroll"><p>MAIN</p><NavLink end to="/doctor"><Icon name="patients" />My patients</NavLink><p>CLINICAL</p><NavLink to="/doctor/prescriptions"><Icon name="rx" />Prescriptions</NavLink><button type="button" onClick={() => { setChatOpen(true); setMobileNavOpen(false); }}><Icon name="chat" />Chat</button><p>ACCOUNT</p><NavLink to="/doctor/security"><Icon name="security" />Account security</NavLink></div>
    </aside>
    <div className="doctor-frontend__body"><header className="doctor-frontend__header">
      <div className="doctor-frontend__heading"><button className="doctor-frontend__menu-toggle" type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button><h1>{title}</h1></div>
      <div className="doctor-frontend__header-actions"><PatientSearchField label="" onSelect={(patient) => navigate(`/doctor/patients/${patient.id}`)} />
        <button className="doctor-frontend__icon-btn" type="button" onClick={() => setChatOpen(true)} aria-label="Open staff chat" title="Staff chat"><Icon name="chat" /></button>
        <NavLink className="doctor-frontend__icon-btn" to="/doctor/notifications" aria-label={unread ? `${unread} unread notifications` : 'Notifications'} title="Notifications"><Icon name="bell" />{unread > 0 && <span className="doctor-frontend__badge">{unread > 99 ? '99+' : unread}</span>}</NavLink>
        <div className="doctor-frontend__profile"><button type="button" className="doctor-frontend__avatar" onClick={() => setProfileOpen((current) => !current)} aria-label="Profile menu" aria-expanded={profileOpen}>{initials || 'DR'}</button>{profileOpen && <div className="doctor-frontend__profile-menu"><strong>{user.fullName}</strong><small>Physician</small><NavLink to="/doctor/security">Account security</NavLink><button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Logout</button></div>}</div>
      </div>
    </header><main><Outlet /></main></div>
    <ChatSidebar open={chatOpen} onClose={() => setChatOpen(false)} />
  </div>;
}
