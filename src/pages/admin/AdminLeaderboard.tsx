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
    year: 'numeric',
  });
}

export function AdminLeaderboard() {
  const [levelId, setLevelId] = useState<number | 'all'>('all');
  const [limit, setLimit] = useState(50);
  const [leaderboard, setLeaderboard] = useState<AdminGameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdminLeaderboard(levelId, limit);
      setLeaderboard(data);
    } finally {
      setLoading(false);
    }
  }, [levelId, limit]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const handleVerify = async (game: AdminGameItem) => {
    const nextState = !game.isVerified;
    const ok = await adminService.verifyGame(game.id, nextState);
    if (ok) {
      setNotice(`Rank #${leaderboard.findIndex((g) => g.id === game.id) + 1} score ${nextState ? 'verified clean' : 'unverified'}.`);
      setTimeout(() => setNotice(null), 3000);
      loadLeaderboard();
    }
  };

  const handleDelete = async (game: AdminGameItem) => {
    if (window.confirm(`Delete leaderboard entry of ${formatScore(game.score)} by @${game.username}? This will remove it from the rankings.`)) {
      const ok = await adminService.deleteGame(game.id);
      if (ok) {
        setNotice('Score removed from rankings.');
        setTimeout(() => setNotice(null), 3000);
        loadLeaderboard();
      }
    }
  };

  const topScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
  const bestTimeMs = leaderboard.length > 0 ? Math.min(...leaderboard.map((g) => g.timeMs)) : 0;
  const zeroMistakesCount = leaderboard.filter((g) => g.mistakes === 0).length;
  const perfectPct = leaderboard.length > 0 ? Math.round((zeroMistakesCount / leaderboard.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🏆</span> Canonical Leaderboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global competitive rankings ordered strictly by: <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">score DESC</code> → <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">time_ms ASC</code> → <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded">mistakes ASC</code>.
          </p>
        </div>

        {/* Quick summary chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
            Top Score: <strong className="font-mono text-white">{formatScore(topScore)}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            Fastest: <strong className="font-mono text-white">{formatTimeMs(bestTimeMs)}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Zero Mistakes: <strong className="font-mono text-white">{perfectPct}%</strong>
          </div>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center justify-between">
          <span>✓ {notice}</span>
          <button onClick={() => setNotice(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── CONTROLS TOOLBAR ─────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <label htmlFor="admin-lb-level" className="text-xs font-semibold text-slate-400">Level:</label>
          <select
            id="admin-lb-level"
            value={levelId}
            onChange={(e) => {
              const val = e.target.value;
              setLevelId(val === 'all' ? 'all' : Number(val));
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Global (All Levels Combined)</option>
            {LEVELS.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                Level {lvl.id} ({lvl.numberCount} numbers · {lvl.difficulty})
              </option>
            ))}
          </select>

          <label htmlFor="admin-lb-show" className="text-xs font-semibold text-slate-400 ml-2">Show:</label>
          <select
            id="admin-lb-show"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>

        <button
          onClick={loadLeaderboard}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold self-start md:self-auto flex items-center gap-1.5"
        >
          <span>↺</span> Refresh Rankings
        </button>
      </div>

      {/* ── LEADERBOARD TABLE ────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 text-center w-16">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3 text-right">Time</th>
                <th className="px-4 py-3 text-right">Mistakes</th>
                <th className="px-4 py-3 text-right">Accuracy</th>
                <th className="px-4 py-3 text-center">Stars</th>
                <th className="px-4 py-3">Recorded</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Moderation</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    <span className="inline-block animate-spin mr-2">◷</span> Calculating canonical rankings...
                  </td>
                </tr>
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    No leaderboard runs recorded for this level yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((g, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;

                  return (
                    <tr
                      key={g.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isTop1 ? 'bg-amber-500/5' : isTop2 ? 'bg-slate-400/5' : isTop3 ? 'bg-amber-700/5' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 text-center">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 font-black text-sm border border-amber-500/40">
                            🥇
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 font-black text-sm border border-slate-300/40">
                            🥈
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700/20 text-amber-500 font-black text-sm border border-amber-700/40">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono text-slate-500 font-semibold">{rank}</span>
                        )}
                      </td>

                      {/* Player */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          to={`/admin/users/${g.userId}`}
                          className="flex items-center gap-2 group hover:text-amber-400"
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                            {g.avatar}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-200 group-hover:text-amber-400">
                              @{g.username}
                            </div>
                            <div className="text-[10px] text-slate-500">{g.displayName}</div>
                          </div>
                        </Link>
                      </td>

                      {/* Level */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-800 text-amber-400 border border-slate-700">
                          L{g.levelId}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-white text-sm">
                        {formatScore(g.score)}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-300">
                        {formatTimeMs(g.timeMs)}
                      </td>

                      {/* Mistakes */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono">
                        {g.mistakes === 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-bold">
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

                      {/* Recorded Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                        {formatDate(g.completedAt)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {g.isFlagged ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950/60 border border-rose-800 text-rose-300 font-bold">
                            ⚠️ Flagged
                          </span>
                        ) : g.isVerified ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-bold">
                            ✓ Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                            Valid
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleVerify(g)}
                            title={g.isVerified ? 'Remove verified badge' : 'Mark score as verified'}
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
                            title="Disqualify/delete score"
                            className="p-1.5 rounded text-xs bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300"
                          >
                            🗑
                          </button>
                          <Link
                            to={`/admin/users/${g.userId}`}
                            title="Inspect user profile"
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
      </div>
    </div>
  );
}
