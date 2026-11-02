import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../auth/AuthContext';
import { HexMark } from './HexMark';
import './console.css';
import './data-table.css';

interface AppShellProps {
  title: string;
  scopeName?: string;
  navItems: Array<{ label: string; path: string; count?: number; icon?: LucideIcon }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const initialsOf = (name?: string) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '·';

const EditorialTitle: React.FC<{ text: string }> = ({ text }) => {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return <>{text}</>;
  const last = words.pop();
  return (
    <>
      {words.join(' ')} <em>{last}</em>
    </>
  );
};

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
    <div className="console">
      <aside className="console-side">
        <div className="console-brand">
          <HexMark size={16} />
          <span>Find Your Mechanic</span>
        </div>

        <nav className="console-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx('console-nav-link', location.pathname === item.path && 'is-active')}
              >
                {Icon && <Icon size={18} strokeWidth={1.7} />}
                <span>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="console-nav-count tabular-nums">{item.count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="console-side-foot">
          <span className="console-avatar">{initialsOf(user?.full_name)}</span>
          <div className="console-user">
            <strong>{user?.full_name}</strong>
            <button onClick={() => logout()}>Log out</button>
          </div>
        </div>
      </aside>

      <div className="console-main">
        <div className="console-sheet">
          <header className="console-top">
            <div>
              <span className="console-eyebrow">{scopeName}</span>
              <h1 className="console-title">
                <EditorialTitle text={title} />
              </h1>
            </div>
            <div className="console-top-actions">
              {actions}
              <Link to="/notifications" className="console-bell" aria-label="Notifications">
                <Bell size={18} strokeWidth={1.7} />
              </Link>
            </div>
          </header>
          <div className="console-body">{children}</div>
        </div>
      </div>
    </div>
  );
};
