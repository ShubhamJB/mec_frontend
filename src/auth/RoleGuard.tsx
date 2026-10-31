import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { UserRole } from '../api/types';

export const RoleGuard: React.FC<{
  allowedRoles: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
        Loading session...
      </div>
    );
  }

  if (!user) {
    const isAdminRoute = location.pathname.startsWith('/admin') || (allowedRoles.length === 1 && allowedRoles[0] === 'ADMIN');
    const loginTarget = isAdminRoute ? '/admin/login' : '/login';
    return <Navigate to={`${loginTarget}?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (user.account_status === 'SUSPENDED') {
    const isAdmin = user.role === 'ADMIN' || location.pathname.startsWith('/admin');
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <h2 style={{ color: 'var(--status-danger-ink)', marginBottom: '12px' }}>Account Suspended</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
          Your account has been suspended by an administrator. Please reach out to customer support.
        </p>
        <button
          onClick={() => {
            sessionStorage.clear();
            window.location.href = isAdmin ? '/admin/login' : '/login';
          }}
          style={{ padding: '8px 16px', background: 'var(--ink)', color: 'var(--on-dark)', borderRadius: '4px' }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'GARAGE_OWNER' ? '/owner' : '/find';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};
