import { useState, useEffect } from 'react';
import { adminService, type AdminLevelActivity } from '../../services/adminService';
import { formatScore, formatTimeMs } from '../../utils/scoring';

const DIFFICULTY_COLORS: Record<string, string> = {
  Novice: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  Easy: 'text-teal-400 bg-teal-950/40 border-teal-800/40',
  Medium: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
  Hard: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
  Expert: 'text-orange-400 bg-orange-950/40 border-orange-800/40',
  Master: 'text-rose-400 bg-rose-950/40 border-rose-800/40',
  Insane: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
};

export function AdminLevels() {
  const [levels, setLevels] = useState<AdminLevelActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await adminService.getLevelAnalytics();
        setLevels(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Compute insights
  const totalPlays = levels.reduce((sum, l) => sum + l.plays, 0);
  const totalCompleted = levels.reduce((sum, l) => sum + l.completed, 0);
  const overallRate = totalPlays > 0 ? ((totalCompleted / totalPlays) * 100).toFixed(1) : '0';

  // Find biggest drop-off level
  const biggestDropoff = levels.reduce((prev, current) => {
    return (current.dropoffPct > prev.dropoffPct) ? current : prev;
  }, levels[0] ?? { levelId: 1, dropoffPct: 0 });

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🎯</span> Level Progression & Drop-off
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analyze game balance, completion rates, and player drop-off across all 16 levels.
          </p>
        </div>

        {/* Global summary chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Total Plays: <strong className="font-mono text-white">{totalPlays.toLocaleString()}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
            Avg Completion: <strong className="font-mono text-white">{overallRate}%</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-400">
            Choke Point: <strong className="font-mono text-white">Level {biggestDropoff?.levelId} ({biggestDropoff?.dropoffPct}%)</strong>
          </div>
        </div>
      </div>

      {/* ── DIFFICULTY & RETENTION FUNNEL OVERVIEW ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Funnel Survival (L1 → L16)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {levels.length > 0 && levels[0].plays > 0
                ? ((levels[levels.length - 1].completed / levels[0].plays) * 100).toFixed(1)
                : '0'}%
            </span>
            <span className="text-xs text-slate-400">reached and cleared Level 16</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Players who complete Level 1 and eventually conquer Level 16 become core retained champions.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Hardest Drop-off Step</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">
              Level {biggestDropoff?.levelId}
            </span>
            <span className="text-xs text-rose-300">-{biggestDropoff?.dropoffPct}% drop from L{biggestDropoff ? biggestDropoff.levelId - 1 : 1}</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Largest player friction point where games fail or players exit before clearing the grid.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Fastest vs Slowest Level</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {levels.length > 0 ? formatTimeMs(levels[0].avgTimeMs) : '—'}
            </span>
            <span className="text-xs text-slate-400">vs {levels.length > 0 ? formatTimeMs(levels[levels.length - 1].avgTimeMs) : '—'} (L16)</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Time scales smoothly with grid size and number density from novice to extreme challenge.
          </p>
        </div>
      </div>

      {/* ── 16 LEVELS TABLE ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3 text-center">Numbers</th>
                <th className="px-4 py-3 text-right">Total Plays</th>
                <th className="px-4 py-3 text-right">Completed</th>
                <th className="px-4 py-3 w-48">Completion Rate</th>
                <th className="px-4 py-3 text-right">Drop-off</th>
                <th className="px-4 py-3 text-right">Avg Time</th>
                <th className="px-4 py-3 text-right">Avg Score</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <span className="inline-block animate-spin mr-2">◷</span> Loading level metrics...
                  </td>
                </tr>
              ) : (
                levels.map((lvl) => {
                  const diffBadge = DIFFICULTY_COLORS[lvl.difficulty] || 'text-slate-300 bg-slate-800 border-slate-700';
                  const isHighDropoff = lvl.dropoffPct >= 20;

                  return (
                    <tr key={lvl.levelId} className="hover:bg-slate-800/40 transition-colors">
                      {/* Level */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded font-black font-mono text-sm bg-slate-950 border border-slate-800 text-white">
                          L{lvl.levelId}
                        </span>
                      </td>

                      {/* Difficulty */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${diffBadge}`}>
                          {lvl.difficulty}
                        </span>
                      </td>

                      {/* Numbers */}
                      <td className="px-4 py-3 whitespace-nowrap text-center font-mono font-bold text-amber-400">
                        {lvl.numberCount}
                      </td>

                      {/* Total Plays */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-200">
                        {lvl.plays.toLocaleString()}
                      </td>

                      {/* Completed */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-200">
                        {lvl.completed.toLocaleString()}
                      </td>

                      {/* Completion Rate with visual bar */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                lvl.completionRate >= 80
                                  ? 'bg-emerald-500'
                                  : lvl.completionRate >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, lvl.completionRate))}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-white w-12 text-right">
                            {lvl.completionRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Drop-off */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono">
                        {lvl.levelId === 1 ? (
                          <span className="text-slate-600">—</span>
                        ) : (
                          <span className={isHighDropoff ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                            -{lvl.dropoffPct}%
                          </span>
                        )}
                      </td>

                      {/* Avg Time */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-300">
                        {formatTimeMs(lvl.avgTimeMs)}
                      </td>

                      {/* Avg Score */}
                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-white font-bold">
                        {formatScore(lvl.avgScore)}
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
