import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type AdminGameItem } from '../../services/adminService';
import { formatScore, formatTimeMs } from '../../utils/scoring';
import { LEVELS } from '../../data/levels';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminGames() {
  const [games, setGames] = useState<AdminGameItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'levels' | 'daily'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'flagged' | 'verified' | 'clean'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState('completedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Action status notification
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getGamesList({
        search,
        levelId: levelFilter,
        mode: modeFilter,
        status: statusFilter,
        page,
        pageSize,
        sortField,
        sortDirection,
      });
      setGames(res.games);
      setTotalCount(res.totalCount);
    } catch (err) {
      console.error('Failed to load games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games history');
    } finally {
      setLoading(false);
    }
  }, [search, levelFilter, modeFilter, statusFilter, page, pageSize, sortField, sortDirection]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  const handleVerify = async (game: AdminGameItem) => {
    const nextState = !game.isVerified;
    const ok = await adminService.verifyGame(game.id, nextState);
    if (ok) {
      setActionNotice(`Game #${game.id.slice(0, 8)} ${nextState ? 'verified clean' : 'unverified'}.`);
      setTimeout(() => setActionNotice(null), 3000);
      loadGames();
    }
  };

  const handleDelete = async (game: AdminGameItem) => {
    if (window.confirm(`Permanently remove score of ${formatScore(game.score)} by @${game.username}? This cannot be undone.`)) {
      const ok = await adminService.deleteGame(game.id);
      if (ok) {
        setActionNotice(`Game record deleted.`);
        setTimeout(() => setActionNotice(null), 3000);
        loadGames();
      }
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Quick summary stats for current view
  const flaggedCount = games.filter((g) => g.isFlagged).length;
  const verifiedCount = games.filter((g) => g.isVerified).length;
  const perfectCount = games.filter((g) => g.mistakes === 0).length;

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🎮</span> Games Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit, filter, inspect, and verify every recorded gameplay session.
          </p>
        </div>

        {/* Quick counter chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Total Recorded: <strong className="text-white font-mono">{totalCount.toLocaleString()}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            Verified: <strong className="font-mono">{verifiedCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-400">
            Flagged: <strong className="font-mono">{flaggedCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
            Perfect: <strong className="font-mono">{perfectCount}</strong>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
          <span>✓ {actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadGames()}
            className="px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── FILTER TOOLBAR ──────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by player @username..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Level Filter */}
          <div>
            <select
              value={levelFilter}
              onChange={(e) => {
                const val = e.target.value;
                setLevelFilter(val === 'all' ? 'all' : Number(val));
                setPage(1);
              }}
              aria-label="Filter games by level"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Levels (1 - 16)</option>
              {LEVELS.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  Level {lvl.id} ({lvl.numberCount} numbers · {lvl.difficulty})
                </option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div>
            <select
              value={modeFilter}
              onChange={(e) => {
                setModeFilter(e.target.value as any);
                setPage(1);
              }}
              aria-label="Filter games by mode"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Modes</option>
              <option value="levels">Standard Levels</option>
              <option value="daily">Daily Challenge</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              aria-label="Filter games by review status"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="clean">Clean Runs</option>
              <option value="flagged">⚠️ Flagged / Suspicious</option>
              <option value="verified">✓ Verified Clean</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicators & Reset */}
        {(search || levelFilter !== 'all' || modeFilter !== 'all' || statusFilter !== 'all') && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400">
              Showing filtered results ({totalCount} total)
            </span>
            <button
              onClick={() => {
                setSearch('');
                setLevelFilter('all');
                setModeFilter('all');
                setStatusFilter('all');
                setPage(1);
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold"
            >
              Reset Filters ↺
            </button>
          </div>
        )}
      </div>

      {/* ── GAMES TABLE ─────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th
                  onClick={() => handleSort('completedAt')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none"
                >
                  Date {sortField === 'completedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Level / Mode</th>
                <th
                  onClick={() => handleSort('score')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none text-right"
                >
                  Score {sortField === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => handleSort('timeMs')}
                  className="px-4 py-3 cursor-pointer hover:text-white select-none text-right"
                >
                  Time {sortField === 'timeMs' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-right">Mistakes</th>
                <th className="px-4 py-3 text-right">Accuracy</th>
                <th className="px-4 py-3 text-center">Stars</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <span className="inline-block animate-spin mr-2">◷</span> Loading game history...
                  </td>
                </tr>
              ) : games.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No gameplay sessions found matching current filters.
                  </td>
                </tr>
              ) : (
                games.map((g) => {
                  const isPerfect = g.mistakes === 0;
                  return (
                    <tr
                      key={g.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        g.isFlagged ? 'bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Date */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-slate-300">{timeAgo(g.completedAt)}</div>
                        <div className="text-[10px] text-slate-500">{formatDate(g.completedAt)}</div>
                      </td>

                      {/* Player */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          to={`/admin/users/${g.userId || g.guestId || 'guest'}`}
                          className="flex items-center gap-2 group hover:text-amber-400"
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                            {g.avatar}
                          </span>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-200 group-hover:text-amber-400">
                                @{g.username}
                              </span>
                              {(g.isGuest || !g.userId || g.userId?.startsWith('guest_')) && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-bold">
                                  Guest
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500">{g.displayName}</div>
                          </div>
                        </Link>
                      </td>

                      {/* Level / Mode */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded font-bold font-mono text-[11px] bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            L{g.levelId}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {g.numberCount} nums
                          </span>
                          {g.isDaily && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-red-950/60 border border-red-800 text-red-300">
                              Daily
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-white">
                        {formatScore(g.score)}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-300">
                        {formatTimeMs(g.timeMs)}
                      </td>

                      {/* Mistakes */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono">
                        {isPerfect ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 font-semibold">
                            0
                          </span>
                        ) : (
                          <span className="text-rose-400 font-bold">{g.mistakes}</span>
                        )}
                      </td>

                      {/* Accuracy */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-300">
                        {g.accuracy}%
                      </td>

                      {/* Stars */}
                      <td className="px-4 py-3 whitespace-nowrap text-center text-amber-400">
                        {'★'.repeat(g.stars)}
                        <span className="text-slate-700">{'★'.repeat(Math.max(0, 3 - g.stars))}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {g.isFlagged ? (
                          <span
                            title={g.flagReason || 'Flagged for abnormal speed/mistakes'}
                            className="px-2 py-0.5 rounded text-[10px] bg-rose-950/60 border border-rose-800 text-rose-300 font-bold"
                          >
                            ⚠️ Flagged
                          </span>
                        ) : g.isVerified ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-bold">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                            Recorded
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleVerify(g)}
                            title={g.isVerified ? 'Remove verification' : 'Verify as genuine'}
                            className={`p-1.5 rounded text-xs transition-colors ${
                              g.isVerified
                                ? 'bg-emerald-950 border border-emerald-700 text-emerald-400 hover:bg-emerald-900'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleDelete(g)}
                            title="Delete game record"
                            className="p-1.5 rounded text-xs bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition-colors"
                          >
                            🗑
                          </button>
                          <Link
                            to={`/admin/users/${g.userId || g.guestId || 'guest'}`}
                            title="Inspect user dossier"
                            className="p-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                          >
                            👤
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ─────────────────────────────────────────────────── */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white font-mono">{games.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
              <strong className="text-white font-mono">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
              <strong className="text-white font-mono">{totalCount}</strong> games
            </span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Games per page"
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs"
            >
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800"
            >
              Previous
            </button>
            <span className="px-2 font-mono text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
