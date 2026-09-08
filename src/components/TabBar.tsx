import { CalendarDays, TrendingUp, BookOpen, Settings } from 'lucide-react';
import type { View } from '../types';

const TABS: { key: View; label: string; Icon: typeof CalendarDays }[] = [
  { key: 'today', label: 'Today', Icon: CalendarDays },
  { key: 'trends', label: 'Trends', Icon: TrendingUp },
  { key: 'history', label: 'History', Icon: BookOpen },
  { key: 'settings', label: 'Settings', Icon: Settings },
];

export function TabBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const active = view === 'checkin' ? 'today' : view;
  return (
    <nav className="tab-bar no-print">
      {TABS.map(({ key, label, Icon }) => (
        <button key={key} className={`tab ${active === key ? 'active' : ''}`} onClick={() => onChange(key)} aria-current={active === key ? 'page' : undefined}>
          <Icon size={24} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
