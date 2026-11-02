import React from 'react';
import { SiteNav } from './SiteNav';
import './site-nav.css';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SiteNav />

      <main style={{ flex: 1 }}>{children}</main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <span>Find Your Mechanic &bull; Verified workshop &amp; garage discovery</span>
          <span>&copy; {new Date().getFullYear()} Find Your Mechanic</span>
        </div>
      </footer>
    </div>
  );
};
