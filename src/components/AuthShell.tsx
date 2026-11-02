import React from 'react';
import { Car, MapPin, Phone, Star, Wrench } from 'lucide-react';
import { SiteNav } from './SiteNav';
import './console.css';
import './auth-shell.css';

interface AuthShellProps {
  mode?: 'login' | 'register';
  children: React.ReactNode;
}

const floatingIcons = [
  { Icon: Wrench, className: 'auth-float auth-float--a' },
  { Icon: MapPin, className: 'auth-float auth-float--b' },
  { Icon: Star, className: 'auth-float auth-float--c' },
  { Icon: Phone, className: 'auth-float auth-float--d' },
];

export const AuthShell: React.FC<AuthShellProps> = ({ children }) => (
  <div className="auth-shell">
    <SiteNav variant="transparent" />

    <main className="auth-main">
      <div className="auth-art" aria-hidden="true">
        {floatingIcons.map(({ Icon, className }) => (
          <span key={className} className={className}>
            <Icon size={20} strokeWidth={1.4} />
          </span>
        ))}
        <div className="auth-block auth-block--dots" />
        <div className="auth-block auth-block--ring" />
        <div className="auth-block auth-block--plinth" />
        <div className="auth-block auth-block--small" />
        <span className="auth-car">
          <Car size={120} strokeWidth={1} />
        </span>
        <svg className="auth-squiggle auth-squiggle--l" viewBox="0 0 140 40" fill="none">
          <path d="M2 28c20-18 36 6 52-8s30-6 42-10 24 6 40 0" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <svg className="auth-squiggle auth-squiggle--r" viewBox="0 0 140 40" fill="none">
          <path d="M2 20c18 14 30-18 48-6s28 10 44 2 30-8 44 6" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <div className="auth-ground" />
      </div>

      <div className="auth-card">{children}</div>
    </main>

    <footer className="auth-foot">&copy; {new Date().getFullYear()} Find Your Mechanic</footer>
  </div>
);
