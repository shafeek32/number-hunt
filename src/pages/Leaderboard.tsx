import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import {
  leaderboardService,
  type LeaderboardItem,
  type TimePeriodFilter,
} from '../services/leaderboardService';
import { formatTimeMs, formatScore } from '../utils/scoring';
import { isSupabaseConfigured } from '../lib/supabase';

type GameModeFilter = 'levels' | 'daily';

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-500 font-black',
  2: 'text-slate-400 font-black',
  3: 'text-amber-700 font-black',
};

export function Leaderboard() {
  const { user } = useAuth();
  const [mode, setMode] = useState<GameModeFilter>('levels');
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [period, setPeriod] = useState<TimePeriodFilter>('all-time');
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setErrorMsg(null);

    leaderboardService
      .getLeaderboard({
        levelId: mode === 'levels' ? selectedLevel : 'all',
        period,
        currentUserId: user?.id,
      })
      .then((res) => {
        if (!isCancelled) {
          if (res.error) {
            setErrorMsg(res.error.message);
          } else {
            setItems(res.items);
            setUserRank(res.userRankItem);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setErrorMsg(err.message || 'Failed to load leaderboard');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [mode, selectedLevel, period, user?.id]);

  return (
    <PageContainer maxWidth="max-w-3xl">
      {/* ── HEADER ─────────────────────────── */}
      <div className="mb-6 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-widest uppercase text-[var(--color-text-primary)]">
            Global Leaderboard
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Rankings based on highest score, fastest time, and fewest mistakes
          </p>
        </div>

        {!user && (
          <Link to="/login">
            <Button variant="primary" size="sm">
              Sign In to Compete
            </Button>
          </Link>
        )}
      </div>

      {/* ── FILTERS BAR ────────────────────── */}
      <Card padding="md" className="mb-6 flex flex-col gap-3">
        {/* Mode & Period Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Mode */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--color-surface-2)] rounded-xl">
            <button
              onClick={() => setMode('levels')}
              className={[
                'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                mode === 'levels'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              LEVELS
            </button>
            <button
              onClick={() => setMode('daily')}
              className={[
                'px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                mode === 'daily'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
              ].join(' ')}
            >
              🔥 DAILY
            </button>
          </div>

          {/* Period */}
          <div className="flex items-center gap-1">
            {(['all-time', 'month', 'week'] as TimePeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={[
                  'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                  period === p
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]',
                ].join(' ')}
              >
                {p === 'all-time' ? 'ALL TIME' : p === 'month' ? 'THIS MONTH' : 'THIS WEEK'}
              </button>
            ))}
          </div>
        </div>

        {/* Level selector (if in Levels mode) */}
        {mode === 'levels' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-[var(--color-border)]">
            <span className="label-tag shrink-0 mr-1">LEVEL:</span>
            <button
              onClick={() => setSelectedLevel('all')}
              className={[
                'px-2.5 py-1 text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer',
                selectedLevel === 'all'
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]',
              ].join(' ')}
            >
              ALL
            </button>
            {Array.from({ length: 16 }, (_, i) => i + 1).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={[
                  'px-2.5 py-1 text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer',
                  selectedLevel === lvl
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]',
                ].join(' ')}
              >
                L{lvl}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ── LEADERBOARD TABLE ──────────────── */}
      <Card padding="none" className="overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-[var(--color-text-muted)] animate-pulse">
            Loading leaderboard rankings...
          </div>
        ) : errorMsg ? (
          <div className="py-12 px-4 text-center">
            <span className="text-2xl mb-1 block">⚠️</span>
            <div className="text-xs font-bold text-[var(--color-error)]">{errorMsg}</div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Please try again in a moment.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <span className="text-3xl mb-2 block">🎯</span>
            <div className="text-sm font-black text-[var(--color-text-primary)]">No scores yet.</div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Be the first hunter on this board!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" aria-label="Global Leaderboard">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
                  <th className="py-2.5 pl-4 pr-2 text-left label-tag w-12">#</th>
                  <th className="py-2.5 pr-3 text-left label-tag">PLAYER</th>
                  <th className="py-2.5 px-2 text-center label-tag hidden sm:table-cell">LEVEL</th>
                  <th className="py-2.5 pr-2 text-right label-tag">SCORE</th>
                  <th className="py-2.5 pr-4 text-right label-tag">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {items.map((entry) => {
                  const rankStyle = RANK_COLORS[entry.rank] || 'text-[var(--color-text-muted)] font-bold';

                  return (
                    <tr
                      key={`${entry.userId}-${entry.rank}-${entry.score}`}
                      className={[
                        'transition-colors duration-100',
                        entry.isCurrentUser
                          ? 'bg-[var(--color-accent-light)]'
                          : 'hover:bg-[var(--color-surface-2)]',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {/* Rank */}
                      <td className={`py-3 pl-4 pr-2 text-sm w-12 ${rankStyle}`}>
                        {entry.rank === 1 ? '🥇 1' : entry.rank === 2 ? '🥈 2' : entry.rank === 3 ? '🥉 3' : `#${entry.rank}`}
                      </td>

                      {/* Player */}
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-[var(--color-surface-3)] flex items-center justify-center text-xs font-black shrink-0">
                            {entry.avatar}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-[var(--color-text-primary)] truncate flex items-center gap-1.5">
                              <span>{entry.displayName}</span>
                              {entry.isCurrentUser && (
                                <span className="text-[0.65rem] font-bold text-[var(--color-accent)] bg-white px-1.5 py-0.2 rounded-full border border-[var(--color-accent)]">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[0.68rem] text-[var(--color-text-muted)] truncate">
                              @{entry.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3 px-2 text-center hidden sm:table-cell">
                        <span className="text-xs font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded-md">
                          L{entry.levelId}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3 pr-2 text-right">
                        <span className="num-display text-sm font-black text-[var(--color-text-primary)]">
                          {formatScore(entry.score)}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-3 pr-4 text-right">
                        <span className="num-display text-xs text-[var(--color-text-secondary)] font-bold">
                          {formatTimeMs(entry.timeMs)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── USER'S PINNED RANK (IF NOT IN TOP 25) ── */}
        {userRank && !items.some((i) => i.isCurrentUser) && (
          <div className="border-t-2 border-[var(--color-accent)] bg-[var(--color-accent-light)] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="num-display font-black text-sm text-[var(--color-accent)]">
                #{userRank.rank}
              </span>
              <div>
                <div className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1">
                  <span>YOUR RANK:</span>
                  <span>{userRank.displayName}</span>
                </div>
                <div className="text-[0.68rem] text-[var(--color-text-muted)]">
                  Level {userRank.levelId}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="num-display text-sm font-black text-[var(--color-text-primary)]">
                {formatScore(userRank.score)}
              </div>
              <div className="num-display text-xs text-[var(--color-text-secondary)]">
                {formatTimeMs(userRank.timeMs)}
              </div>
            </div>
          </div>
        )}
      </Card>

      {!isSupabaseConfigured && (
        <p className="text-[0.7rem] text-[var(--color-text-muted)] text-center mt-4">
          Demo Mode · Configure Supabase in .env to connect to live global competition
        </p>
      )}
    </PageContainer>
  );
}
