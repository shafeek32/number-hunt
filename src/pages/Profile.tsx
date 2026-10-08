import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { StarRating } from '../components/common/StarRating';
import { ACHIEVEMENTS } from '../data/achievements';
import { formatTimeMs, formatScore } from '../utils/scoring';
import { useAuth } from '../hooks/useAuth';
import { gameService } from '../services/gameService';
import { achievementService } from '../services/achievementService';
import { adminService } from '../services/adminService';
import {
  getStoredPlayerStats,
  getUnlockedLevels,
  getTotalStars,
  getStreakData,
  getUnlockedAchievements,
  type StoredPlayerStats,
} from '../utils/storage';
import type { StreakData } from '../types/game';
import type { GameRow } from '../types/database';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function StatCard({ label, value, sub, accent = false }: StatCardProps) {
  return (
    <Card padding="md" className="flex flex-col gap-1">
      <span className="label-tag">{label}</span>
      <span
        className={[
          'num-display text-2xl font-black leading-none',
          accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-[var(--color-text-muted)]">{sub}</span>}
    </Card>
  );
}

export function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [stats, setStats] = useState<StoredPlayerStats | null>(null);
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [totalStars, setTotalStars] = useState<number>(0);
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
  });
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);
  const [recentGames, setRecentGames] = useState<GameRow[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      adminService.isAdmin().then(setIsAdmin);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  useEffect(() => {
    // 1. Initial load from LocalStorage cache
    setStats(getStoredPlayerStats());
    setUnlockedLevels(getUnlockedLevels());
    setTotalStars(getTotalStars());
    setStreak(getStreakData());
    setUnlockedAchievementIds(getUnlockedAchievements());

    // 2. If authenticated, fetch cloud data
    if (user) {
      setLoadingCloud(true);
      Promise.all([
        gameService.getPlayerStats(user.id),
        achievementService.getUserAchievements(user.id),
        gameService.getGameHistory(user.id, 10),
      ])
        .then(([cloudStats, cloudAchs, games]) => {
          if (cloudStats) {
            setStats({
              totalGames: cloudStats.total_games,
              perfectGames: cloudStats.perfect_games,
              bestScore: cloudStats.best_score,
              bestTimeMs: cloudStats.best_time_ms,
              consecutivePerfectGames: 0,
            });
            if (cloudStats.highest_level > 1) {
              setUnlockedLevels(Array.from({ length: cloudStats.highest_level }, (_, i) => i + 1));
            }
            if (cloudStats.total_stars > 0) {
              setTotalStars(cloudStats.total_stars);
            }
            if (cloudStats.current_streak > 0) {
              setStreak((prev) => ({
                ...prev,
                currentStreak: cloudStats.current_streak,
                longestStreak: Math.max(prev.longestStreak, cloudStats.longest_streak),
              }));
            }
          }
          if (cloudAchs && cloudAchs.length > 0) {
            setUnlockedAchievementIds((prev) => Array.from(new Set([...prev, ...cloudAchs])));
          }
          if (games) {
            setRecentGames(games);
          }
        })
        .finally(() => {
          setLoadingCloud(false);
        });
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const totalGames = stats?.totalGames ?? 0;
  const perfectGames = stats?.perfectGames ?? 0;
  const bestScore = stats?.bestScore ?? 0;
  const bestTimeMs = stats?.bestTimeMs ?? null;
  const highestLevel = Math.max(1, ...unlockedLevels);
  const unlockedCount = unlockedAchievementIds.length;

  return (
    <PageContainer maxWidth="max-w-lg">
      {/* ── AVATAR & PLAYER HEADER ────────── */}
      <div className="flex flex-col items-center text-center gap-3 mb-6 pt-2">
        <div
          className="w-20 h-20 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center font-black text-2xl shadow-[var(--shadow-md)]"
          aria-label="Player avatar"
        >
          {profile?.avatar || (user ? '⚡' : 'GP')}
        </div>

        <div>
          <h1 className="font-black text-2xl tracking-widest uppercase text-[var(--color-text-primary)]">
            {profile?.display_name || (user ? user.email?.split('@')[0] : 'Guest Player')}
          </h1>
          {user && profile?.username && (
            <div className="text-xs text-[var(--color-text-muted)] font-bold mt-0.5">
              @{profile.username}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <Badge variant="neutral">Level {highestLevel} / 16</Badge>
            <Badge variant="warning">⭐ {totalStars} / 48 Stars</Badge>
            {streak.currentStreak > 0 && (
              <Badge variant="warning">🔥 {streak.currentStreak} day streak</Badge>
            )}
            {user ? (
              <Badge variant="success">☁️ Cloud Synced</Badge>
            ) : (
              <Badge variant="neutral">💾 Local Guest</Badge>
            )}
          </div>
        </div>

        {/* Auth Action */}
        <div className="mt-1 flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="secondary" size="sm" className="text-xs border-[var(--color-accent)] text-[var(--color-accent)]">
                    🛡️ Admin Dashboard
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="secondary" size="sm">
                Sign In to Save to Cloud →
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loadingCloud && (
        <div className="text-center text-xs font-bold text-[var(--color-text-muted)] mb-4 animate-pulse">
          Refreshing cloud records...
        </div>
      )}

      {/* ── PLAYER STATS GRID ─────────────── */}
      <h2 className="label-tag mb-3">PLAYER STATS</h2>
      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard
          label="LEVEL PROGRESS"
          value={`${highestLevel} / 16`}
          sub="Levels unlocked"
        />
        <StatCard
          label="STARS EARNED"
          value={`${totalStars} / 48`}
          sub="3 stars per level"
          accent
        />
        <StatCard
          label="TOTAL GAMES"
          value={String(totalGames)}
        />
        <StatCard
          label="PERFECT RUNS"
          value={String(perfectGames)}
          sub="0 mistake games"
        />
        <StatCard
          label="BEST SCORE"
          value={bestScore > 0 ? formatScore(bestScore) : '—'}
        />
        <StatCard
          label="BEST TIME"
          value={bestTimeMs !== null ? formatTimeMs(bestTimeMs) : '—'}
          sub="Fastest completion"
          accent
        />
        <StatCard
          label="CURRENT STREAK"
          value={`${streak.currentStreak} ${streak.currentStreak === 1 ? 'DAY' : 'DAYS'}`}
        />
        <StatCard
          label="LONGEST STREAK"
          value={`${streak.longestStreak} ${streak.longestStreak === 1 ? 'DAY' : 'DAYS'}`}
          sub="Personal record"
        />
      </div>

      {/* ── RECENT CLOUD GAMES (AUTHENTICATED ONLY) ── */}
      {user && recentGames.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="label-tag">RECENT GAMES</h2>
            <span className="text-[0.68rem] text-[var(--color-text-muted)] font-bold">
              CLOUD HISTORY
            </span>
          </div>

          <Card padding="none" className="overflow-hidden divide-y divide-[var(--color-border)] shadow-xs">
            {recentGames.map((game) => (
              <div key={game.id} className="p-3 flex items-center justify-between text-xs hover:bg-[var(--color-surface-2)]">
                <div className="flex items-center gap-3">
                  <div className="num-display font-black text-sm text-[var(--color-text-primary)]">
                    L{game.level_id}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <StarRating stars={game.stars} size="sm" />
                      <span className="font-bold text-[var(--color-text-secondary)]">
                        {formatTimeMs(game.time_ms)}
                      </span>
                    </div>
                    <div className="text-[0.65rem] text-[var(--color-text-muted)]">
                      {new Date(game.completed_at).toLocaleDateString()} · {game.mistakes} mistakes
                    </div>
                  </div>
                </div>

                <div className="num-display font-black text-xs text-[var(--color-text-primary)]">
                  {formatScore(game.score)} pts
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── ACHIEVEMENTS SECTION ──────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="label-tag">ACHIEVEMENTS</h2>
        <span className="text-xs font-bold text-[var(--color-text-secondary)]">
          {unlockedCount} / {ACHIEVEMENTS.length} UNLOCKED
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlockedAchievementIds.includes(ach.id);

          return (
            <Card
              key={ach.id}
              padding="md"
              className={[
                'flex items-start gap-3 transition-all',
                isUnlocked
                  ? 'border-amber-200 bg-[var(--color-surface)] shadow-xs'
                  : 'opacity-50 bg-[var(--color-surface-2)]',
              ].join(' ')}
            >
              <div
                className={[
                  'text-2xl p-2 rounded-xl flex items-center justify-center shrink-0',
                  isUnlocked ? 'bg-amber-100' : 'bg-[var(--color-surface-3)]',
                ].join(' ')}
              >
                {isUnlocked ? ach.icon : '🔒'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-black text-sm text-[var(--color-text-primary)] truncate">
                    {ach.title}
                  </span>
                  {isUnlocked ? (
                    <span className="text-[0.65rem] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
                      ✓ Unlocked
                    </span>
                  ) : (
                    <span className="text-[0.65rem] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-3)] px-1.5 py-0.5 rounded-full shrink-0">
                      Locked
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  {ach.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
