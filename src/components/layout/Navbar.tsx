import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/',            label: 'Home' },
  { to: '/levels',      label: 'Play',        highlight: true },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/daily',       label: 'Daily' },
  { to: '/profile',     label: 'Profile' },
];

export function Navbar() {
  const { user, profile } = useAuth();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
      style={{ height: 'var(--nav-height)' }}
    >
      <nav
        className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 group"
          aria-label="Number Hunt home"
        >
          <span className="num-display text-xl text-[var(--color-accent)] leading-none">
            #
          </span>
          <span className="font-black text-sm tracking-widest uppercase text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors duration-150">
            Number Hunt
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-2">
          <ul className="hidden md:flex items-center gap-1 list-none m-0 p-0">
            {NAV_ITEMS.map(({ to, label, highlight }) => (
              <li key={to}>
                {highlight ? (
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      [
                        'inline-flex items-center h-9 px-4 rounded-xl text-sm font-bold tracking-wide transition-all duration-150',
                        isActive
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
                      ].join(' ')
                    }
                  >
                    {label}
                  </NavLink>
                ) : (
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      [
                        'inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'text-[var(--color-accent)] bg-[var(--color-accent-light)]'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]',
                      ].join(' ')
                    }
                  >
                    {label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>

          {/* Auth button in desktop header */}
          <div className="hidden md:flex items-center pl-2 border-l border-[var(--color-border)] ml-1">
            {user ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
                title="View your account profile"
              >
                <span className="w-6 h-6 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center text-xs font-black">
                  {profile?.avatar || '⚡'}
                </span>
                <span className="text-xs font-bold text-[var(--color-text-primary)] max-w-[90px] truncate">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
