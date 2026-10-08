import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type AdminUserItem } from '../../services/adminService';
import { formatScore } from '../../utils/scoring';

type FilterType = 'all' | 'active_today' | 'new_today' | 'last_7d' | 'inactive';

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>('joinedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const PAGE_SIZE = 15;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsersList({
        search,
        filter,
        page,
        pageSize: PAGE_SIZE,
        sortField,
        sortDirection,
      });
      setUsers(res.users);
      setTotalCount(res.totalCount);
    } finally {
      setLoading(false);
    }
  }, [search, filter, page, sortField, sortDirection]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const handleBanToggle = async (user: AdminUserItem) => {
    if (user.isBanned) {
      if (window.confirm(`Lift ban for @${user.username}?`)) {
        await adminService.unbanUser(user.id);
        loadUsers();
      }
    } else {
      const reason = window.prompt(`Reason for banning @${user.username}:`, 'Suspicious score manipulation');
      if (!reason) return;
      const daysStr = window.prompt('Ban duration in days (leave blank for permanent):');
      const days = daysStr ? parseInt(daysStr, 10) : undefined;
      await adminService.banUser({ userId: user.id, reason, durationDays: days });
      loadUsers();
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* ── HEADER & SEARCH ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>👥</span> Users Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, search, inspect, and moderate registered player accounts.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <span className="absolute left-3 top-2.5 text-slate-500 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Search username, display name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* ── FILTERS & STATS SUMMARY ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all',          label: 'All Players' },
              { key: 'active_today', label: 'Active Today' },
              { key: 'new_today',    label: 'New Today' },
              { key: 'last_7d',      label: 'Last 7 Days' },
              { key: 'inactive',     label: 'Inactive' },
            ] as { key: FilterType; label: string }[]
          ).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setFilter(p.key);
                setPage(1);
              }}
              className={[
                'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                filter === p.key
                  ? 'bg-[var(--color-accent)] text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <b>{users.length}</b> of <b>{totalCount}</b> users
        </div>
      </div>

      {/* ── USERS TABLE (SECTION 10 COLUMNS) ────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider select-none">
                <th className="py-3 px-3">Player</th>
                <th className="py-3 px-3">Email</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('totalGames')}
                >
                  Games {sortField === 'totalGames' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('bestScore')}
                >
                  Best Score {sortField === 'bestScore' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-3 px-3 text-center cursor-pointer hover:text-white"
                  onClick={() => handleSort('highestLevel')}
                >
                  Level {sortField === 'highestLevel' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-3 text-center">Perfect</th>
                <th className="py-3 px-3 text-center">Streak</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('joinedAt')}
                >
                  Joined {sortField === 'joinedAt' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:text-white"
                  onClick={() => handleSort('lastPlayedAt')}
                >
                  Last Played {sortField === 'lastPlayedAt' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin mx-auto mb-2" />
                    Loading player registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    No users matching the selected filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className={[
                      'hover:bg-slate-800/30 transition-colors',
                      u.isBanned ? 'bg-rose-950/20' : '',
                    ].join(' ')}
                  >
                    {/* Avatar & Player Name */}
                    <td className="py-2.5 px-3">
                      <Link to={`/admin/users/${u.id}`} className="flex items-center gap-2 group">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shrink-0">
                          {u.avatar}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
                              {u.displayName}
                            </span>
                            {u.isAdmin && (
                              <span className="px-1.5 py-0.2 rounded text-[0.6rem] font-black bg-amber-500/15 text-amber-400 uppercase">
                                Admin
                              </span>
                            )}
                            {u.isBanned && (
                              <span className="px-1.5 py-0.2 rounded text-[0.6rem] font-black bg-rose-500/20 text-rose-400 uppercase">
                                Banned
                              </span>
                            )}
                          </div>
                          <span className="text-[0.68rem] text-slate-500 font-mono block">
                            @{u.username}
                          </span>
                        </div>
                      </Link>
                    </td>

                    {/* Email */}
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[0.7rem] truncate max-w-[150px]">
                      {u.email}
                    </td>

                    {/* Games */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {u.totalGames}
                    </td>

                    {/* Best Score */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {u.bestScore > 0 ? formatScore(u.bestScore) : '—'}
                    </td>

                    {/* Level */}
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[0.7rem] font-bold bg-sky-500/10 text-sky-400 font-mono">
                        L{u.highestLevel}
                      </span>
                    </td>

                    {/* Perfect Games */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      {u.perfectGames > 0 ? (
                        <span className="text-emerald-400 font-bold">{u.perfectGames}</span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>

                    {/* Streak */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      {u.currentStreak > 0 ? (
                        <span className="text-amber-400 font-bold">🔥 {u.currentStreak}d</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[0.7rem]">
                      {formatDate(u.joinedAt)}
                    </td>

                    {/* Last Played */}
                    <td className="py-2.5 px-3 text-right font-mono text-[0.7rem]">
                      <span className={u.lastPlayedAt ? 'text-slate-300' : 'text-slate-600'}>
                        {timeAgo(u.lastPlayedAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[0.7rem] font-bold rounded-lg transition-colors"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleBanToggle(u)}
                          className={[
                            'px-2 py-1 text-[0.7rem] font-bold rounded-lg transition-colors cursor-pointer',
                            u.isBanned
                              ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20',
                          ].join(' ')}
                          title={u.isBanned ? 'Lift player ban' : 'Issue ban'}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ─────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page <b>{page}</b> of <b>{totalPages}</b>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
