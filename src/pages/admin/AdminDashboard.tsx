import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type DashboardMetrics, type DateRangeFilter } from '../../services/adminService';
import { DateRangeFilterComponent } from '../../components/admin/DateRangeFilter';
import { StatCard } from '../../components/admin/StatCard';
import { PlayerActivityChart } from '../../components/admin/charts/PlayerActivityChart';
import { GamesVolumeChart } from '../../components/admin/charts/GamesVolumeChart';
import { LevelDropoffChart } from '../../components/admin/charts/LevelDropoffChart';
import { formatTimeMs, formatScore } from '../../utils/scoring';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning 👋';
  if (hour < 18) return 'Good afternoon 👋';
  return 'Good evening 👋';
}

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

export function AdminDashboard() {
  const [filter, setFilter] = useState<DateRangeFilter>({ key: 'today' });
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getDashboardMetrics(filter);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {getGreeting()}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Here's what's happening with Number Hunt.
          </p>

          {metrics && (
            <div className="flex items-center gap-2 flex-wrap text-xs mt-3">
              <span className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-300 font-medium flex items-center gap-1.5">
                <span>👥</span> Registered: <strong className="text-white font-mono">{metrics.totalUsers.toLocaleString()}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300 font-medium flex items-center gap-1.5">
                <span>👤</span> Guest Players Played: <strong className="text-white font-mono">{metrics.guestPlayersCount.toLocaleString()}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-medium flex items-center gap-1.5">
                <span>🎮</span> Total Players: <strong className="text-white font-mono">{(metrics.totalUsers + metrics.guestPlayersCount).toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <DateRangeFilterComponent value={filter} onChange={setFilter} />

          <button
            type="button"
            onClick={loadMetrics}
            disabled={loading}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh metrics"
          >
            <span className={loading ? 'inline-block animate-spin' : ''}>🔄</span>
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin mb-3" />
          <span className="text-xs font-mono">Aggregating live game metrics...</span>
        </div>
      ) : metrics ? (
        <>
          {/* ── TOP KPI STATISTICS (SECTION 5) ───────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Registered Users"
              value={metrics.totalUsers.toLocaleString()}
              sub="Cloud accounts"
              icon="👥"
              accent="blue"
            />
            <StatCard
              label="Guest Players"
              value={metrics.guestPlayersCount.toLocaleString()}
              sub={`${metrics.guestGamesPlayed.toLocaleString()} guest runs played`}
              icon="👤"
              accent="purple"
            />
            <StatCard
              label="New Users"
              value={metrics.newUsersToday.toLocaleString()}
              sub={filter.key === 'today' ? 'Joined today' : 'Joined in range'}
              icon="🌟"
              accent="cyan"
            />
            <StatCard
              label="Active Players"
              value={metrics.activePlayersToday.toLocaleString()}
              sub="Unique hunters"
              icon="⚡"
              accent="yellow"
            />
            <StatCard
              label="Games Started"
              value={metrics.gamesStartedToday.toLocaleString()}
              sub="Total sessions"
              icon="🎮"
              accent="purple"
            />
            <StatCard
              label="Games Completed"
              value={metrics.gamesCompletedToday.toLocaleString()}
              sub="Cleared runs"
              icon="✅"
              accent="green"
            />
            <StatCard
              label="Completion Rate"
              value={`${metrics.completionRate}%`}
              sub="Cleared vs started"
              icon="🎯"
              accent={metrics.completionRate >= 80 ? 'green' : 'orange'}
            />
            <StatCard
              label="Average Score"
              value={formatScore(metrics.averageScore)}
              sub="Points per game"
              icon="🏆"
              accent="pink"
            />
            <StatCard
              label="Average Time"
              value={metrics.averageTimeMs > 0 ? formatTimeMs(metrics.averageTimeMs) : '—'}
              sub="Per cleared level"
              icon="⏱️"
              accent="blue"
            />
            <StatCard
              label="Perfect Games"
              value={metrics.perfectGames.toLocaleString()}
              sub="0 mistake runs"
              icon="⭐"
              accent="yellow"
            />
            <StatCard
              label="Total Play Time"
              value={formatDuration(metrics.totalPlayTimeMs)}
              sub="All players combined"
              icon="⏳"
              accent="orange"
            />
          </div>

          {/* ── CHARTS (SECTIONS 6 & 7) ─────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PlayerActivityChart
              data={metrics.activitySeries}
              isHourly={filter.key === 'today' || filter.key === 'yesterday'}
            />
            <GamesVolumeChart
              data={metrics.gamesSeries}
              isHourly={filter.key === 'today' || filter.key === 'yesterday'}
            />
          </div>

          {/* ── TOP PLAYERS (SECTION 8) ─────────────────────────────────── */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <span>🏆</span> TOP PLAYERS (CANONICAL RANKING)
                </h3>
                <p className="text-[0.7rem] text-slate-400 mt-0.5">
                  Ranked by Score DESC → Time ASC → Mistakes ASC
                </p>
              </div>

              <Link
                to="/admin/leaderboard"
                className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                View Full Board →
              </Link>
            </div>

            {metrics.topPlayers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No player records submitted in this time period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                      <th className="py-2.5 px-3">Player</th>
                      <th className="py-2.5 px-3 text-center">Level</th>
                      <th className="py-2.5 px-3 text-right">Score</th>
                      <th className="py-2.5 px-3 text-right">Time</th>
                      <th className="py-2.5 px-3 text-center">Mistakes</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {metrics.topPlayers.map((player) => (
                      <tr key={player.userId + player.levelId} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 text-center font-black">
                          {player.rank === 1 && <span className="text-amber-400">🥇 1</span>}
                          {player.rank === 2 && <span className="text-slate-300">🥈 2</span>}
                          {player.rank === 3 && <span className="text-amber-600">🥉 3</span>}
                          {player.rank > 3 && <span className="text-slate-500">#{player.rank}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <Link
                            to={`/admin/users/${player.userId}`}
                            className="flex items-center gap-2 group"
                          >
                            <span className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs">
                              {player.avatar || '⚡'}
                            </span>
                            <div>
                              <span className="font-bold text-slate-200 group-hover:text-sky-400 transition-colors block">
                                {player.displayName}
                              </span>
                              <span className="text-[0.68rem] text-slate-500 font-mono">
                                @{player.username}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[0.7rem] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                            L{player.levelId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                          {formatScore(player.score)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {formatTimeMs(player.timeMs)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {player.mistakes === 0 ? (
                            <span className="text-emerald-400 font-bold">0</span>
                          ) : (
                            <span className="text-amber-400 font-bold">{player.mistakes}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            to={`/admin/users/${player.userId}`}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[0.68rem] font-bold rounded-lg transition-colors"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── LEVEL ACTIVITY & DROPOFF (SECTION 9) ─────────────────────── */}
          <LevelDropoffChart levels={metrics.levelActivity} />
        </>
      ) : null}
    </div>
  );
}
