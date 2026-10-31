import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { HexMark } from './HexMark';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 'var(--navbar-height, 68px)',
          padding: '0 32px',
          boxSizing: 'border-box',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--bg)',
          position: 'relative',
          zIndex: 100,
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HexMark size={16} />
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '-0.02em' }}>
            Find Your Mechanic
          </strong>
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: 'var(--step-caption)' }}>
          <Link to="/garages" style={{ color: 'var(--ink)' }}>Garages</Link>

          {user ? (
            <>
              {user.role === 'GARAGE_OWNER' && (
                <Link to="/owner" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                  Owner Dashboard
                </Link>
              )}
              {user.role === 'ADMIN' && (
                <Link to="/admin" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                  Admin Console
                </Link>
              )}
              {user.role === 'CUSTOMER' && (
                <Link to="/account" style={{ color: 'var(--ink)' }}>
                  My Account
                </Link>
              )}
              <Link to="/notifications" style={{ color: 'var(--ink)' }}>
                Notifications
              </Link>
              <button
                onClick={() => logout()}
                style={{ color: 'var(--muted)', fontSize: 'inherit' }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ color: 'var(--ink)' }}>Log in</Link>
              <Link
                to="/register"
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'var(--ink)',
                  color: 'var(--accent-ink)',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500,
                }}
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      <footer
        style={{
          padding: '24px 32px',
          borderTop: '1px solid var(--rule)',
          fontSize: 'var(--step-small)',
          color: 'var(--muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>Find Your Mechanic &bull; Verified Workshop &amp; Garage Discovery</div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>&copy; {new Date().getFullYear()} Find Your Mechanic</span>
        </div>
      </footer>
    </div>
  );
};
