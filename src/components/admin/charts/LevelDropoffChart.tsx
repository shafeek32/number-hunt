import type { AdminLevelActivity } from '../../../types/admin';
import { formatTimeMs, formatScore } from '../../../utils/scoring';

interface Props {
  levels: AdminLevelActivity[];
}

export function LevelDropoffChart({ levels }: Props) {
  if (!levels || levels.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span>🗺️</span> LEVEL ACTIVITY & DROP-OFF ANALYSIS
          </h3>
          <p className="text-[0.7rem] text-slate-400 mt-0.5">
            Progression retention across all 16 levels. Spot difficulty spikes where players quit.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[0.68rem] text-slate-400 font-bold uppercase tracking-wider">
              <th className="py-2.5 px-3">Level</th>
              <th className="py-2.5 px-3">Difficulty</th>
              <th className="py-2.5 px-3 text-right">Plays</th>
              <th className="py-2.5 px-3 text-right">Completed</th>
              <th className="py-2.5 px-3 w-48">Completion %</th>
              <th className="py-2.5 px-3 text-right">Avg Time</th>
              <th className="py-2.5 px-3 text-right">Avg Score</th>
              <th className="py-2.5 px-3 text-right">Drop-off</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {levels.map((lvl) => {
              const isHighDropoff = lvl.dropoffPct > 25;

              return (
                <tr key={lvl.levelId} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-black text-sky-400 num-display">
                    L{lvl.levelId}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={[
                        'text-[0.65rem] px-2 py-0.5 rounded-full font-bold uppercase',
                        lvl.difficulty === 'easy'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : lvl.difficulty === 'normal'
                          ? 'bg-sky-500/10 text-sky-400'
                          : lvl.difficulty === 'hard'
                          ? 'bg-amber-500/10 text-amber-400'
                          : lvl.difficulty === 'very-hard'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-purple-500/10 text-purple-400',
                      ].join(' ')}
                    >
                      {lvl.difficulty}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {lvl.plays.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-white font-bold">
                    {lvl.completed.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={[
                            'h-full rounded-full transition-all duration-300',
                            lvl.completionRate >= 90
                              ? 'bg-emerald-500'
                              : lvl.completionRate >= 70
                              ? 'bg-sky-500'
                              : lvl.completionRate >= 50
                              ? 'bg-amber-500'
                              : 'bg-rose-500',
                          ].join(' ')}
                          style={{ width: `${Math.min(100, Math.max(5, lvl.completionRate))}%` }}
                        />
                      </div>
                      <span className="text-[0.7rem] font-mono text-slate-300 w-10 text-right">
                        {lvl.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {lvl.avgTimeMs > 0 ? formatTimeMs(lvl.avgTimeMs) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {lvl.avgScore > 0 ? formatScore(lvl.avgScore) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {lvl.levelId === 1 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span
                        className={[
                          'px-1.5 py-0.5 rounded text-[0.68rem] font-bold',
                          isHighDropoff
                            ? 'bg-rose-500/15 text-rose-400'
                            : 'text-slate-400',
                        ].join(' ')}
                      >
                        {lvl.dropoffPct > 0 ? `-${lvl.dropoffPct}%` : '0%'}
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
  );
}
