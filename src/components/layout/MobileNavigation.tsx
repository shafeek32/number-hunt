import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',            label: 'Home',        icon: '⊙' },
  { to: '/levels',      label: 'Play',        icon: '▶', highlight: true },
  { to: '/leaderboard', label: 'Board',       icon: '🏆' },
  { to: '/daily',       label: 'Daily',       icon: '🔥' },
  { to: '/profile',     label: 'Me',          icon: '◎' },
];

export function MobileNavigation() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)]"
      style={{ height: 'var(--mobile-nav-height)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      <ul className="flex h-full list-none m-0 p-0">
        {NAV_ITEMS.map(({ to, label, icon, highlight }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center h-full gap-0.5 w-full',
                  'text-xs font-semibold transition-colors duration-150',
                  isActive
                    ? highlight
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'flex items-center justify-center w-10 h-7 rounded-xl transition-all duration-150 text-base',
                      isActive
                        ? highlight
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-accent-light)]'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
