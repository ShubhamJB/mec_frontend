import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { HexMark } from './HexMark';

interface AppShellProps {
  title: string;
  scopeName?: string;
  navItems: Array<{ label: string; path: string; count?: number }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  title,
  scopeName = 'Workshop',
  navItems,
  actions,
  children,
}) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--app-chrome)',
      }}
    >
      {/* Sidebar Frame */}
      <aside
        style={{
          width: 'var(--sidebar-width, 240px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
          flexShrink: 0,
          position: 'relative',
          zIndex: 100000,
        }}
      >
        <div style={{ marginBottom: '24px', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <HexMark size={14} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px' }}>
              Find Your Mechanic
            </span>
          </div>
          <div style={{ fontSize: 'var(--step-small)', color: 'var(--muted)', paddingLeft: '18px' }}>
            {scopeName}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--step-caption)',
                  color: isActive ? 'var(--ink)' : 'var(--ink-secondary)',
                  backgroundColor: isActive ? 'var(--app-active)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--rule)',
                      color: 'var(--ink)',
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '16px', paddingLeft: '8px' }}>
          <div style={{ fontSize: 'var(--step-small)', fontWeight: 500 }}>{user?.full_name}</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px' }}>{user?.email}</div>
          <button
            onClick={() => logout()}
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content framed in white sheet with 1px border and soft corners */}
      <div
        style={{
          flex: 1,
          padding: '8px 8px 8px 0',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--app-sheet)',
            borderRadius: 'var(--radius-sheet)',
            border: '1px solid var(--app-sheet-edge)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top header bar */}
          <header
            style={{
              height: '56px',
              borderBottom: '1px solid var(--app-sheet-edge)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
            }}
          >
            <h1 style={{ fontSize: '18px', fontWeight: 600 }}>{title}</h1>
            {actions && <div>{actions}</div>}
          </header>

          {/* Sheet Body */}
          <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
