import { useState, useEffect, useCallback } from 'react';
import { adminService, type DashboardMetrics, type DateRangeFilter } from '../../services/adminService';
import { DateRangeFilterBar } from '../../components/admin/DateRangeFilter';
import { PlayerActivityChart } from '../../components/admin/charts/PlayerActivityChart';
import { GamesVolumeChart } from '../../components/admin/charts/GamesVolumeChart';
import { LevelDropoffChart } from '../../components/admin/charts/LevelDropoffChart';

interface DeepDiveData {
  hourlyHeatmap: { hour: number; count: number }[];
  accuracyBuckets: { label: string; count: number; pct: number }[];
  mistakeBuckets: { label: string; count: number; pct: number }[];
  levelFunnel: { level: number; dropoffPct: number; activePct: number }[];
}

export function AdminAnalytics() {
  const [filter, setFilter] = useState<DateRangeFilter>({ key: '7d' });
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [deepDive, setDeepDive] = useState<DeepDiveData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, d] = await Promise.all([
        adminService.getDashboardMetrics(filter),
        adminService.getAnalyticsDeepDive(filter),
      ]);
      setMetrics(m);
      setDeepDive(d);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Find peak hour
  const peakHourItem = deepDive?.hourlyHeatmap.reduce((max, h) => (h.count > max.count ? h : max), { hour: 0, count: 0 });
  const formatHour = (h: number) => `${h.toString().padStart(2, '0')}:00`;

  const maxHeatCount = Math.max(1, ...(deepDive?.hourlyHeatmap.map((h) => h.count) || [1]));

  return (
    <div className="space-y-6">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📊</span> Deep-Dive Game Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Player behavior, accuracy metrics, session distributions, and hourly engagement patterns.
          </p>
        </div>

        <DateRangeFilterBar value={filter} onChange={setFilter} />
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-500 text-sm">
          <span className="inline-block animate-spin mr-2">◷</span> Calculating analytics telemetry...
        </div>
      ) : !metrics || !deepDive ? (
        <div className="py-24 text-center text-slate-500 text-sm">
          No analytics data found for this period.
        </div>
      ) : (
        <>
          {/* ── KPI HIGHLIGHTS ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-purple-400 uppercase font-semibold">Guest Players Played</div>
              <div className="text-xl font-black text-purple-300 font-mono mt-1">
                {metrics.guestPlayersCount.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {metrics.guestGamesPlayed.toLocaleString()} guest runs recorded
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Peak Playtime</div>
              <div className="text-xl font-black text-amber-400 font-mono mt-1">
                {formatHour(peakHourItem?.hour ?? 0)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {peakHourItem?.count ?? 0} active player sessions
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Completion Ratio</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                {metrics.completionRate}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {metrics.gamesCompletedToday} / {metrics.gamesStartedToday} runs finished
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Perfect Run Rate</div>
              <div className="text-xl font-black text-sky-400 font-mono mt-1">
                {metrics.gamesCompletedToday > 0
                  ? ((metrics.perfectGames / metrics.gamesCompletedToday) * 100).toFixed(1)
                  : '0'}%
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {metrics.perfectGames} runs with zero mistakes
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Average Session Time</div>
              <div className="text-xl font-black text-white font-mono mt-1">
                {(metrics.averageTimeMs / 1000).toFixed(1)}s
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {Math.round(metrics.totalPlayTimeMs / 60000)} mins total play time
              </div>
            </div>
          </div>

          {/* ── MAIN CHARTS ROW ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PlayerActivityChart
              data={metrics.activitySeries}
              isHourly={filter.key === 'today' || filter.key === 'yesterday'}
            />
            <GamesVolumeChart
              data={metrics.gamesSeries}
              isHourly={filter.key === 'today' || filter.key === 'yesterday'}
            />
          </div>

          {/* ── 24-HOUR ENGAGEMENT HEATMAP ─────────────────────────────────── */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span>⏰</span> 24-Hour Activity Heatmap
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Hourly player load distribution across universal local time.
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <span>Low</span>
                <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
                <span className="w-3 h-3 rounded bg-amber-950 border border-amber-800" />
                <span className="w-3 h-3 rounded bg-amber-700" />
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="w-3 h-3 rounded bg-amber-400" />
                <span>Peak</span>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5 pt-2">
              {deepDive.hourlyHeatmap.map((item) => {
                const ratio = item.count / maxHeatCount;
                let bgClass = 'bg-slate-950 border-slate-800/60 text-slate-600';
                if (ratio > 0.8) bgClass = 'bg-amber-400 text-slate-950 font-bold';
                else if (ratio > 0.6) bgClass = 'bg-amber-500 text-slate-950 font-bold';
                else if (ratio > 0.35) bgClass = 'bg-amber-700/80 text-white';
                else if (ratio > 0.15) bgClass = 'bg-amber-950 text-amber-300 border border-amber-800/40';
                else if (item.count > 0) bgClass = 'bg-slate-800 text-slate-300 border border-slate-700/60';

                return (
                  <div
                    key={item.hour}
                    title={`${formatHour(item.hour)}: ${item.count} sessions`}
                    className={`h-16 rounded-lg flex flex-col items-center justify-between p-1.5 border transition-transform hover:scale-105 cursor-default ${bgClass}`}
                  >
                    <span className="text-[9px] font-mono opacity-80">{item.hour}h</span>
                    <span className="text-xs font-mono font-black">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ACCURACY & MISTAKE DISTRIBUTIONS ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accuracy Distribution */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>🎯</span> Player Accuracy Distribution
              </h3>
              <div className="space-y-3 pt-1">
                {deepDive.accuracyBuckets.map((bucket) => (
                  <div key={bucket.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">{bucket.label}</span>
                      <span className="font-mono text-slate-400">
                        <strong className="text-white">{bucket.count}</strong> runs ({bucket.pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${bucket.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mistake Distribution */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>❌</span> Mistake Count per Run
              </h3>
              <div className="space-y-3 pt-1">
                {deepDive.mistakeBuckets.map((bucket) => (
                  <div key={bucket.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">{bucket.label}</span>
                      <span className="font-mono text-slate-400">
                        <strong className="text-white">{bucket.count}</strong> runs ({bucket.pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          bucket.label.startsWith('0') ? 'bg-amber-400' : 'bg-rose-500'
                        }`}
                        style={{ width: `${bucket.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── LEVEL DROPOFF CHART ────────────────────────────────────────── */}
          <LevelDropoffChart levels={metrics.levelActivity} />
        </>
      )}
    </div>
  );
}
