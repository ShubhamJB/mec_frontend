import {
  Building2,
  ClipboardCheck,
  FilePenLine,
  Flag,
  LayoutDashboard,
  ScrollText,
  UsersRound,
} from 'lucide-react';

export interface AdminNavCounts {
  registrations?: number;
  profileChanges?: number;
  reports?: number;
}

export const getAdminNavItems = (counts: AdminNavCounts = {}) => [
  { label: 'Overview', path: '/admin', icon: LayoutDashboard },
  { label: 'Garage Registrations', path: '/admin/registrations', count: counts.registrations, icon: ClipboardCheck },
  { label: 'Profile Changes', path: '/admin/profile-changes', count: counts.profileChanges, icon: FilePenLine },
  { label: 'Garages', path: '/admin/garages', icon: Building2 },
  { label: 'Users', path: '/admin/users', icon: UsersRound },
  { label: 'Review Reports', path: '/admin/reports', count: counts.reports, icon: Flag },
  { label: 'Audit Log', path: '/admin/audit', icon: ScrollText },
];
