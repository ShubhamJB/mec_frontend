import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ClipboardCheck,
  FilePenLine,
  Flag,
  LayoutDashboard,
  ScrollText,
  UsersRound,
} from 'lucide-react';
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
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Garage Registrations', path: '/admin/registrations', count: pendingRegs, icon: ClipboardCheck },
    { label: 'Profile Changes', path: '/admin/profile-changes', count: pendingProfile, icon: FilePenLine },
    { label: 'Garages', path: '/admin/garages', icon: Building2 },
    { label: 'Users', path: '/admin/users', icon: UsersRound },
    { label: 'Review Reports', path: '/admin/reports', count: pendingReports, icon: Flag },
    { label: 'Audit Log', path: '/admin/audit', icon: ScrollText },
  ];

  const show = (value: number) => (isLoading ? '—' : value.toLocaleString());

  const queues = [
    {
      to: '/admin/registrations',
      label: 'New garage submissions',
      value: pendingRegs,
      note: 'Awaiting verification and decision',
      cta: 'Review submissions',
      tone: 'c-card--tint',
    },
    {
      to: '/admin/profile-changes',
      label: 'Critical profile edits',
      value: pendingProfile,
      note: 'Name, address or coordinate changes',
      cta: 'Review edits',
      tone: '',
    },
    {
      to: '/admin/reports',
      label: 'Customer review reports',
      value: pendingReports,
      note: 'Flagged for spam or abuse',
      cta: 'Open reports',
      tone: '',
    },
  ];

  const stats = [
    { label: 'Registered users', value: totalUsers },
    { label: 'Total garages', value: totalGarages },
    { label: 'Approved garages', value: approvedGarages },
    { label: 'Total reviews', value: totalReviews },
    { label: 'Driver call taps', value: totalCalls },
  ];

  return (
    <AppShell title="Moderation & System Overview" scopeName="Admin console" navItems={navItems}>
      {errorMsg && <div className="c-alert">{errorMsg}</div>}

      <section className="c-section">
        <p className="c-eyebrow">Pending queues take priority over totals</p>
        <div className="c-grid c-grid--3">
          {queues.map((queue) => (
            <Link key={queue.to} to={queue.to} className={`c-card ${queue.tone}`}>
              <span className="c-label">{queue.label}</span>
              <span className="c-num tabular-nums">{show(queue.value)}</span>
              <span className="c-note">{queue.note}</span>
              <span className="c-link">{queue.cta} &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="c-section">
        <p className="c-eyebrow">Platform statistics</p>
        <div className="c-grid c-grid--5">
          {stats.map((stat) => (
            <div key={stat.label} className="c-card c-card--white">
              <span className="c-label">{stat.label}</span>
              <span className="c-num c-num--sm tabular-nums">{show(stat.value)}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
};
