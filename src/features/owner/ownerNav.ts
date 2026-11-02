import { CalendarDays, ClipboardCheck, Images, LayoutDashboard, Search, Siren, UsersRound, Wrench } from 'lucide-react';

export const ownerNavItems = [
  { label: 'Dashboard', path: '/owner', icon: LayoutDashboard },
  { label: 'Photos', path: '/owner/photos', icon: Images },
  { label: 'Services & Vehicles', path: '/owner/services', icon: Wrench },
  { label: 'Staff', path: '/owner/staff', icon: UsersRound },
  { label: 'Roadside assistance', path: '/owner/roadside', icon: Siren },
  { label: 'Weekly Schedule', path: '/owner/hours', icon: CalendarDays },
  { label: 'Registration Status', path: '/owner/registration', icon: ClipboardCheck },
  { label: 'Browse garages', path: '/garages', icon: Search },
];
