import { NavLink, Link } from 'react-router-dom';

interface Props {
  onCloseMobile?: () => void;
}

const NAV_ITEMS = [
  { to: '/admin',              label: 'Dashboard',    icon: '📊', end: true },
  { to: '/admin/users',        label: 'Users',        icon: '👥' },
  { to: '/admin/games',        label: 'Games',        icon: '🎮' },
  { to: '/admin/leaderboard',  label: 'Leaderboard',  icon: '🏆' },
  { to: '/admin/levels',       label: 'Levels',       icon: '🗺️' },
  { to: '/admin/achievements',  label: 'Achievements', icon: '🎖️' },
  { to: '/admin/analytics',    label: 'Analytics',    icon: '📈' },
  { to: '/admin/settings',     label: 'Settings',     icon: '⚙️' },
];

export function AdminSidebar({ onCloseMobile }: Props) {
  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
        <Link
          to="/admin"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 group"
        >
          <span className="w-8 h-8 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
            #
          </span>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-wider uppercase text-white leading-tight">
              Number Hunt
            </span>
            <span className="text-[0.65rem] font-bold text-slate-400 tracking-widest uppercase">
              Admin Console
            </span>
          </div>
        </Link>
        <span className="text-[0.6rem] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
          PRO
        </span>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto" aria-label="Admin navigation">
        <div className="text-[0.68rem] font-extrabold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Management
        </div>
        <ul className="space-y-1 list-none p-0 m-0">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150',
                    isActive
                      ? 'bg-[var(--color-accent)] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900',
                  ].join(' ')
                }
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <Link
          to="/levels"
          onClick={onCloseMobile}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-colors"
        >
          <span>🎮</span>
          <span>Back to Game</span>
        </Link>
      </div>
    </aside>
  );
}
