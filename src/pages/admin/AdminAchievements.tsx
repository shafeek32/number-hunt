import { useState, useEffect } from 'react';
import { adminService, type AdminAchievementStat } from '../../services/adminService';

const RARITY_COLORS: Record<string, string> = {
  Common: 'text-slate-300 bg-slate-800 border-slate-700',
  Uncommon: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
  Rare: 'text-sky-400 bg-sky-950/40 border-sky-800/40',
  Legendary: 'text-amber-400 bg-amber-950/40 border-amber-800/40 animate-pulse',
};

export function AdminAchievements() {
  const [achievements, setAchievements] = useState<AdminAchievementStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [rarityFilter, setRarityFilter] = useState<'All' | 'Common' | 'Uncommon' | 'Rare' | 'Legendary'>('All');
  const [sortOrder, setSortOrder] = useState<'most' | 'least'>('most');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await adminService.getAchievementsAnalytics();
        setAchievements(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalUnlocks = achievements.reduce((sum, a) => sum + a.unlockedCount, 0);

  // Identify most and least unlocked
  const sorted = [...achievements].sort((a, b) => b.unlockedCount - a.unlockedCount);
  const mostCommon = sorted[0];
  const rarest = sorted[sorted.length - 1];

  // Apply filters and sort for display
  let displayed = achievements;
  if (rarityFilter !== 'All') {
    displayed = displayed.filter((a) => a.rarity === rarityFilter);
  }
  displayed = [...displayed].sort((a, b) => {
    return sortOrder === 'most' ? b.unlockRate - a.unlockRate : a.unlockRate - b.unlockRate;
  });

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🏆</span> Achievement Distribution
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global badge unlock counts, player penetration rates, and rarity distribution.
          </p>
        </div>

        {/* Global summary chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Total Badges: <strong className="font-mono text-white">{achievements.length}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400">
            Total Unlocks: <strong className="font-mono text-white">{totalUnlocks.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* ── INSIGHT SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Most Common */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
            {mostCommon?.icon || '🏆'}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Most Common Badge</div>
            <div className="text-sm font-bold text-white truncate">{mostCommon?.title || '—'}</div>
            <div className="text-xs text-emerald-400 font-mono">
              {mostCommon?.unlockRate}% of players ({mostCommon?.unlockedCount} unlocked)
            </div>
          </div>
        </div>

        {/* Rarest Badge */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-center text-2xl shrink-0">
            {rarest?.icon || '✨'}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Rarest Trophy</div>
            <div className="text-sm font-bold text-amber-400 truncate">{rarest?.title || '—'}</div>
            <div className="text-xs text-amber-300 font-mono">
              {rarest?.unlockRate}% of players ({rarest?.unlockedCount} unlocked)
            </div>
          </div>
        </div>

        {/* Total Player Penetration */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
            🎯
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Average Unlocks / Player</div>
            <div className="text-sm font-bold text-white">
              {achievements.length > 0 ? (totalUnlocks / Math.max(1, mostCommon?.unlockedCount || 1)).toFixed(1) : '0'} Badges
            </div>
            <div className="text-xs text-slate-400">
              out of 12 available milestones
            </div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ──────────────────────────────────────────────────────── */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400">Rarity:</span>
          {(['All', 'Common', 'Uncommon', 'Rare', 'Legendary'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRarityFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                rarityFilter === r
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="admin-ach-sort" className="text-xs font-semibold text-slate-400">Sort:</label>
          <select
            id="admin-ach-sort"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="most">Highest Unlock Rate</option>
            <option value="least">Lowest Unlock Rate (Rarest)</option>
          </select>
        </div>
      </div>

      {/* ── ACHIEVEMENTS GRID ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            <span className="inline-block animate-spin mr-2">◷</span> Loading achievement stats...
          </div>
        ) : displayed.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No achievements found for this filter.
          </div>
        ) : (
          displayed.map((ach) => {
            const rarityStyle = RARITY_COLORS[ach.rarity] || 'text-slate-300 bg-slate-800 border-slate-700';

            return (
              <div
                key={ach.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl p-2 rounded-xl bg-slate-950 border border-slate-800/80">
                        {ach.icon}
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-sm">{ach.title}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${rarityStyle}`}>
                          {ach.rarity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                {/* Unlock Bar & Count */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      <strong className="text-white">{ach.unlockedCount}</strong> players
                    </span>
                    <span className="text-amber-400 font-bold">{ach.unlockRate}%</span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        ach.rarity === 'Legendary'
                          ? 'bg-amber-400'
                          : ach.rarity === 'Rare'
                          ? 'bg-sky-400'
                          : ach.rarity === 'Uncommon'
                          ? 'bg-emerald-400'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, ach.unlockRate))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
