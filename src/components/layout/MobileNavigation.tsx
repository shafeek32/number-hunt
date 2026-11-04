import { NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',            label: 'Home',        icon: '⊙' },
  { to: '/levels',      label: 'Play',        icon: '▶', highlight: true },
  { to: '/multiplayer', label: 'Duel',        icon: '⚔️' },
  { to: '/leaderboard', label: 'Board',       icon: '🏆' },
  { to: '/daily',       label: 'Daily',       icon: '🔥' },
  { to: '/profile',     label: 'Me',          icon: '◎' },
];

export function MobileNavigation() {
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] shadow-lg"
      style={{
        height: 'calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Mobile navigation"
    >
      <ul className="flex h-full list-none m-0 p-0 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ to, label, icon, highlight }) => (
          <li key={to} className="flex-1 min-w-0">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center h-full px-1 gap-0.5 w-full',
                  'text-[10px] sm:text-xs font-bold transition-colors duration-150',
                  isActive
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'flex items-center justify-center w-8 sm:w-10 h-6 sm:h-7 rounded-xl transition-all duration-150 text-sm sm:text-base',
                      isActive
                        ? highlight
                          ? 'bg-[var(--color-accent)] text-white shadow-xs'
                          : 'bg-[var(--color-accent-light)]'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {icon}
                  </span>
                  <span className="truncate max-w-full leading-tight">{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
