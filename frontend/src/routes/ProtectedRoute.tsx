import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { hasAnyPermission, hasPermission } from '../lib/permissions';

interface ProtectedRouteProps {
  permission?: string;
  /** Allow access when the user has any of these permissions. */
  permissions?: string[];
}

export function ProtectedRoute({ permission, permissions }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Loading Medora...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = permissions?.length
    ? hasAnyPermission(user, permissions)
    : permission
      ? hasPermission(user, permission)
      : true;

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
