import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { subscribeToLoading } from '../api/client';

export const GlobalLoadingSpinner: React.FC = () => {
  const [activeCount, setActiveCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = subscribeToLoading((count) => {
      setActiveCount(count);
    });
    return unsubscribe;
  }, []);

  if (activeCount === 0) return null;

  // Pages with localized component loading (e.g. Discovery page with side filter, Admin registrations table)
  // handle their own dimmed region so the side filters and tables remain visible and interactive
  if (location.pathname === '/garages' || location.pathname.startsWith('/admin/registrations')) {
    return null;
  }

  // On AppShell routes (Owner & Admin portals), exclude the left sidebar with all navigation tabs
  const isAppShellRoute =
    (location.pathname.startsWith('/owner') || location.pathname.startsWith('/admin')) &&
    location.pathname !== '/admin/login';

  return (
    <>
      <style>{`
        @keyframes fym-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fym-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Screen Overlay with Subtle Dim & Blur
          - In AppShell pages: leaves the left sidebar untouched (left: 240px) and centers over the active sheet
          - In Public pages: leaves the top navbar untouched (top: 68px) and centers over public page content */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Loading data"
        style={{
          position: 'fixed',
          top: isAppShellRoute ? 0 : 'var(--navbar-height, 68px)',
          left: isAppShellRoute ? 'var(--sidebar-width, 240px)' : 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          backgroundColor: 'color-mix(in srgb, var(--bg) 45%, transparent)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'fym-fade 0.15s ease-out',
          pointerEvents: 'all',
        }}
      >
        {/* Clean Center Spinner (No Modal Card) */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          style={{
            animation: 'fym-spin 0.85s linear infinite',
            transformOrigin: 'center',
          }}
        >
          {/* Subtle track */}
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke="var(--border)"
            strokeWidth="3.5"
            opacity="0.6"
          />
          {/* Animated active stroke */}
          <path
            d="M24 4 A 20 20 0 0 1 44 24"
            stroke="var(--accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--ink)',
            letterSpacing: '0.01em',
          }}
        >
          Loading...
        </span>
      </div>
    </>
  );
};
