import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { cx } from './cx';

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/plan', label: 'Plan', icon: 'plan' },
  { to: '/progress', label: 'Progress', icon: 'progress' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-bg/85 pb-safe backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              cx('flex h-14 flex-col items-center justify-center gap-0.5 text-micro font-semibold tracking-normal', isActive ? 'text-accent' : 'text-ink-3')
            }
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
