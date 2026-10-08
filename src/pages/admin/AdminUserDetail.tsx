import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { adminService, type AdminUserDetail as UserDetailType } from '../../services/adminService';
import { StatCard } from '../../components/admin/StatCard';
import { formatTimeMs, formatScore } from '../../utils/scoring';

function formatDuration(totalMs: number): string {
  if (!totalMs || totalMs <= 0) return '0s';
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<UserDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminService.getUserDetail(id);
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleBanToggle = async () => {
    if (!detail) return;
    if (detail.isBanned) {
      if (window.confirm(`Lift ban for @${detail.profile.username}?`)) {
        await adminService.unbanUser(detail.profile.id);
        loadUser();
      }
    } else {
      const reason = window.prompt(`Reason for banning @${detail.profile.username}:`, 'Suspected score tampering');
      if (!reason) return;
      const daysStr = window.prompt('Duration in days (leave blank for permanent):');
      const days = daysStr ? parseInt(daysStr, 10) : undefined;
      await adminService.banUser({ userId: detail.profile.id, reason, durationDays: days });
      loadUser();
    }
  };

  const handleVerifyGame = async (gameId: string, verify: boolean) => {
    await adminService.verifyGame(gameId, verify);
    loadUser();
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm('Delete this game record permanently?')) return;
    await adminService.deleteGame(gameId);
    loadUser();
  };

  if (loading && !detail) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-mono">Loading player dossier...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-16 text-center">
        <span className="text-3xl mb-2 block">🔍</span>
        <h2 className="text-base font-bold text-white mb-2">Player not found</h2>
        <p className="text-xs text-slate-400 mb-4">The requested user ID could not be located in the database.</p>
        <Link to="/admin/users" className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">
          ← Back to Users
        </Link>
      </div>
    );
  }

  const { profile, stats, recentGames, levelPerformance } = detail;

  return (
    <div className="space-y-6">
      {/* ── BREADCRUMB & TOP ACTIONS ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Link to="/admin/users" className="hover:text-white transition-colors">
            Users
          </Link>
          <span>/</span>
          <span className="text-slate-200">@{profile.username}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBanToggle}
            className={[
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              detail.isBanned
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30',
            ].join(' ')}
          >
            {detail.isBanned ? '✓ Lift Ban' : '🔨 Ban User'}
          </button>
        </div>
      </div>

      {/* ── USER HEADER CARD (SECTION 11) ───────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-3xl shadow-sm">
              {profile.avatar || '⚡'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-white">
                  {profile.display_name}
                </h1>
                <span className="text-xs font-mono text-slate-400 font-bold">
                  @{profile.username}
                </span>
                {detail.isAdmin && (
                  <span className="px-2 py-0.5 rounded-md text-[0.65rem] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Administrator
                  </span>
                )}
                {detail.isBanned && (
                  <span className="px-2 py-0.5 rounded-md text-[0.65rem] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40">
                    Banned
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                <span>📧 {profile.email || `${profile.username}@player.numberhunt`}</span>
                <span>📅 Joined {formatDate(profile.created_at)}</span>
                <span>ID: <code className="text-sky-400">{profile.id.slice(0, 8)}...</code></span>
              </div>
            </div>
          </div>
        </div>

        {detail.isBanned && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <span>⚠️</span>
            <div>
              <b>Banned:</b> {detail.banReason || 'Rule violation'}{' '}
              {detail.banExpiresAt ? `(Expires: ${formatDate(detail.banExpiresAt)})` : '(Permanent)'}
            </div>
          </div>
        )}
      </div>

      {/* ── 10-CARD STATISTICS GRID (SECTION 11) ─────────────────────────── */}
      <div>
        <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
          <span>📊</span> PLAYER CAREER STATISTICS
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Games"
            value={stats.total_games}
            sub="Sessions played"
            icon="🎮"
            accent="purple"
          />
          <StatCard
            label="Completed Games"
            value={stats.total_games}
            sub="Successful clears"
            icon="✅"
            accent="green"
          />
          <StatCard
            label="Best Score"
            value={stats.best_score > 0 ? formatScore(stats.best_score) : '—'}
            sub="All-time high"
            icon="🏆"
            accent="pink"
          />
          <StatCard
            label="Best Level"
            value={`L${stats.highest_level || 1}`}
            sub="Highest cleared"
            icon="🗺️"
            accent="cyan"
          />
          <StatCard
            label="Perfect Games"
            value={stats.perfect_games}
            sub="Zero mistake runs"
            icon="⭐"
            accent="yellow"
          />
          <StatCard
            label="Current Streak"
            value={`${stats.current_streak}d`}
            sub="Active daily streak"
            icon="🔥"
            accent="orange"
          />
          <StatCard
            label="Longest Streak"
            value={`${stats.longest_streak}d`}
            sub="Career record"
            icon="⚡"
            accent="orange"
          />
          <StatCard
            label="Total Play Time"
            value={formatDuration(detail.totalPlayTimeMs)}
            sub="In-game time"
            icon="⏳"
            accent="blue"
          />
          <StatCard
            label="Average Score"
            value={formatScore(detail.averageScore)}
            sub="Points per game"
            icon="📈"
            accent="blue"
          />
          <StatCard
            label="Average Time"
            value={detail.averageTimeMs > 0 ? formatTimeMs(detail.averageTimeMs) : '—'}
            sub="Per completed game"
            icon="⏱️"
            accent="cyan"
          />
        </div>
      </div>

      {/* ── LEVEL PERFORMANCE TABLE (SECTION 11) ───────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
          <span>🗺️</span> LEVEL PERFORMANCE MATRIX (1–16)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Level</th>
                <th className="py-2.5 px-3 text-right">Best Score</th>
                <th className="py-2.5 px-3 text-right">Best Time</th>
                <th className="py-2.5 px-3 text-center">Best Stars</th>
                <th className="py-2.5 px-3 text-right">Games Played</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {levelPerformance.map((lp) => {
                const isCleared = lp.gamesPlayed > 0;
                return (
                  <tr key={lp.levelId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 font-mono font-bold text-sky-400">
                      Level {lp.levelId}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-white">
                      {lp.bestScore > 0 ? formatScore(lp.bestScore) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {lp.bestTimeMs ? formatTimeMs(lp.bestTimeMs) : '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {lp.bestStars > 0 ? (
                        <span className="text-amber-400 font-bold">
                          {'⭐'.repeat(lp.bestStars)}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {lp.gamesPlayed}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isCleared ? (
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-500/10 text-emerald-400">
                          Cleared
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-slate-800 text-slate-500">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RECENT GAMES HISTORY (SECTION 11) ───────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
          <span>🎮</span> COMPLETE GAME HISTORY ({recentGames.length} GAMES)
        </h3>

        {recentGames.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No games recorded for this player yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Level</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-right">Time</th>
                  <th className="py-2.5 px-3 text-center">Mistakes</th>
                  <th className="py-2.5 px-3 text-center">Accuracy</th>
                  <th className="py-2.5 px-3 text-center">Stars</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {recentGames.map((g) => (
                  <tr
                    key={g.id}
                    className={[
                      'hover:bg-slate-800/30 transition-colors',
                      g.isFlagged ? 'bg-rose-950/20' : '',
                    ].join(' ')}
                  >
                    <td className="py-2.5 px-3 font-mono text-[0.7rem] text-slate-400">
                      {formatDate(g.completedAt)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                      L{g.levelId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-slate-800 text-slate-300">
                        {g.isDaily ? 'Daily' : 'Levels'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {formatScore(g.score)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                      {formatTimeMs(g.timeMs)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {g.mistakes === 0 ? (
                        <span className="text-emerald-400 font-bold">0</span>
                      ) : (
                        <span className="text-amber-400 font-bold">{g.mistakes}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {g.accuracy}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-amber-400">{'⭐'.repeat(g.stars)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {g.isFlagged ? (
                        <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-rose-500/20 text-rose-400">
                          🚩 Flagged
                        </span>
                      ) : g.isVerified ? (
                        <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-emerald-500/15 text-emerald-400">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[0.65rem] font-bold bg-slate-800 text-slate-400">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleVerifyGame(g.id, !g.isVerified)}
                          className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          {g.isVerified ? 'Unverify' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGame(g.id)}
                          className="px-2 py-0.5 rounded text-[0.65rem] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
