import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bell } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../auth/AuthContext';
import { HexMark } from './HexMark';
import './site-nav.css';

const initialsOf = (name?: string) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '·';

const linkClass = ({ isActive }: { isActive: boolean }) => clsx('site-nav__link', isActive && 'is-active');

interface SiteNavProps {
  variant?: 'solid' | 'transparent' | 'floating';
  sections?: Array<{ label: string; onClick: () => void }>;
  primaryAction?: { label: string; to: string };
}

export const SiteNav: React.FC<SiteNavProps> = ({ variant = 'solid', sections, primaryAction }) => {
  const { user, logout } = useAuth();

  return (
    <header className={`site-nav site-nav--${variant}`}>
      <div className="site-nav__inner">
        <Link to="/" className="site-nav__brand">
          <HexMark size={18} />
          <span>Find Your Mechanic</span>
        </Link>

        <nav className="site-nav__links" aria-label="Primary">
          {sections ? (
            sections.map((section) => (
              <button key={section.label} type="button" className="site-nav__link" onClick={section.onClick}>
                {section.label}
              </button>
            ))
          ) : (
            <>
              <NavLink to="/garages" className={linkClass}>Garages</NavLink>
              {(!user || user.role === 'CUSTOMER') && <NavLink to="/roadside" className={linkClass}>Roadside help</NavLink>}
              {user?.role === 'GARAGE_OWNER' && <NavLink to="/owner" className={linkClass}>Owner dashboard</NavLink>}
              {user?.role === 'ADMIN' && <NavLink to="/admin" className={linkClass}>Admin console</NavLink>}
              {user?.role === 'CUSTOMER' && <NavLink to="/account" className={linkClass}>My account</NavLink>}
            </>
          )}
        </nav>

        <div className="site-nav__actions">
          {user ? (
            <>
              <Link to="/notifications" className="site-nav__icon" aria-label="Notifications">
                <Bell size={18} strokeWidth={1.7} />
              </Link>
              <span className="site-nav__avatar" title={user.full_name}>{initialsOf(user.full_name)}</span>
              <button type="button" className="site-nav__btn site-nav__btn--ghost" onClick={() => logout()}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="site-nav__btn site-nav__btn--ghost">Log in</Link>
              <Link to={primaryAction?.to ?? '/register'} className="site-nav__btn site-nav__btn--primary">
                {primaryAction?.label ?? 'Register'}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
