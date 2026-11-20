import { AppShell } from '../../frontend/src/components/layout/AppShell';
import { useAuth } from '../../frontend/src/features/auth/AuthContext';
import { doctorPortalUrl } from '../../frontend/src/lib/portal-urls';
import './AdminFrontend.css';

export function AdminFrontend() {
  const { user } = useAuth();
  if (user?.roleCodes.includes('physician') && !user.isSuperAdmin) return <main className="portal-access-message"><h1>Doctor portal</h1><p>This account belongs to a physician. Open the doctor portal and sign in there.</p><a href={doctorPortalUrl}>Open doctor portal</a></main>;
  return <AppShell />;
}
