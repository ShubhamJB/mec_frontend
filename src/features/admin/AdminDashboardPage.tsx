import React, { useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiClient } from '../../api/client';
import { AdminDashboardCounts } from '../../api/types';

export const AdminDashboardPage: React.FC = () => {
  const [counts, setCounts] = useState<AdminDashboardCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiClient<AdminDashboardCounts>('/admin/dashboard')
      .then((data) => {
        setCounts(data);
        setErrorMsg(null);
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load platform counts.');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const pendingRegs = counts?.pending_registrations ?? counts?.pending_registrations_count ?? 0;
  const pendingProfile = counts?.pending_profile_changes ?? counts?.pending_profile_changes_count ?? 0;
  const pendingReports = counts?.pending_review_reports ?? counts?.pending_reports_count ?? 0;
  const totalUsers = counts?.total_users ?? counts?.users_count ?? 0;
  const totalGarages = counts?.total_garages ?? counts?.garages_count ?? 0;
  const approvedGarages = counts?.approved_garages ?? 0;
  const totalReviews = counts?.total_reviews ?? counts?.total_reviews_count ?? 0;
  const totalCalls = counts?.total_call_clicks ?? counts?.call_clicks_count ?? 0;

  const navItems = [
    { label: 'Overview', path: '/admin' },
    { label: 'Garage Registrations', path: '/admin/registrations', count: pendingRegs },
    { label: 'Profile Changes', path: '/admin/profile-changes', count: pendingProfile },
    { label: 'Garages', path: '/admin/garages' },
    { label: 'Users', path: '/admin/users' },
    { label: 'Review Reports', path: '/admin/reports', count: pendingReports },
    { label: 'Audit Log', path: '/admin/audit' },
  ];

  return (
    <AppShell title="Moderation & System Overview" scopeName="Admin Console" navItems={navItems}>
      <p style={{ color: 'var(--muted)', fontSize: 'var(--step-caption)', marginBottom: '24px' }}>
        Pending moderation queues take operational priority over aggregate totals.
      </p>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--status-danger-bg)',
            color: 'var(--status-danger-ink)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: 'var(--step-small)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Action Queues Section */}
      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
        Pending Action Queues
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#fff',
          marginBottom: '36px',
        }}
      >
        <a
          href="/admin/registrations"
          style={{
            padding: '20px',
            borderRight: '1px solid var(--rule)',
            display: 'block',
          }}
        >
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            New Garage Submissions
          </span>
          <span className="tabular-nums" style={{ fontSize: '28px', fontWeight: 500, color: pendingRegs ? 'var(--accent)' : 'inherit' }}>
            {isLoading ? '—' : pendingRegs}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            Awaiting verification & decision
          </span>
        </a>

        <a
          href="/admin/profile-changes"
          style={{
            padding: '20px',
            borderRight: '1px solid var(--rule)',
            display: 'block',
          }}
        >
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Critical Profile Edits
          </span>
          <span className="tabular-nums" style={{ fontSize: '28px', fontWeight: 500 }}>
            {isLoading ? '—' : pendingProfile}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            Name, address or coordinate changes
          </span>
        </a>

        <a
          href="/admin/reports"
          style={{
            padding: '20px',
            display: 'block',
          }}
        >
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Customer Review Reports
          </span>
          <span className="tabular-nums" style={{ fontSize: '28px', fontWeight: 500, color: pendingReports ? 'var(--status-danger-ink)' : 'inherit' }}>
            {isLoading ? '—' : pendingReports}
          </span>
          <span style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
            Flagged for spam or abuse
          </span>
        </a>
      </div>

      {/* Aggregate Totals */}
      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
        Platform Statistics
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--rule)' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Registered Users
          </span>
          <span className="tabular-nums" style={{ fontSize: '22px', fontWeight: 500 }}>
            {isLoading ? '—' : totalUsers}
          </span>
        </div>

        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--rule)' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Total Garages
          </span>
          <span className="tabular-nums" style={{ fontSize: '22px', fontWeight: 500 }}>
            {isLoading ? '—' : totalGarages}
          </span>
        </div>

        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--rule)' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Approved Garages
          </span>
          <span className="tabular-nums" style={{ fontSize: '22px', fontWeight: 500, color: 'var(--status-open-ink)' }}>
            {isLoading ? '—' : approvedGarages}
          </span>
        </div>

        <div style={{ padding: '16px 20px', borderRight: '1px solid var(--rule)' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Total Reviews
          </span>
          <span className="tabular-nums" style={{ fontSize: '22px', fontWeight: 500 }}>
            {isLoading ? '—' : totalReviews}
          </span>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <span style={{ display: 'block', fontSize: 'var(--step-small)', color: 'var(--muted)', marginBottom: '4px' }}>
            Driver Call Taps
          </span>
          <span className="tabular-nums" style={{ fontSize: '22px', fontWeight: 500 }}>
            {isLoading ? '—' : totalCalls}
          </span>
        </div>
      </div>
    </AppShell>
  );
};
