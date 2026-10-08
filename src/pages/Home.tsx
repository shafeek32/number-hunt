import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { formatTimeMs, formatScore } from '../utils/scoring';
import {
  getStoredPlayerStats,
  getUnlockedLevels,
  getTotalStars,
  getStreakData,
  type StoredPlayerStats,
} from '../utils/storage';
import type { StreakData } from '../types/game';

export function Home() {
  const [stats, setStats] = useState<StoredPlayerStats | null>(null);
  const [unlockedCount, setUnlockedCount] = useState<number>(1);
  const [totalStars, setTotalStars] = useState<number>(0);
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
  });

  useEffect(() => {
    setStats(getStoredPlayerStats());
    setUnlockedCount(getUnlockedLevels().length);
    setTotalStars(getTotalStars());
    setStreak(getStreakData());
  }, []);

  const bestDisplay =
    stats?.bestTimeMs !== null && stats?.bestTimeMs !== undefined
      ? formatTimeMs(stats.bestTimeMs)
      : '—';

  return (
    <PageContainer maxWidth="max-w-sm">
      {/* ── HERO ─────────────────────────────────── */}
      <section className="flex flex-col items-center text-center gap-6 pt-5 pb-7">
        <div>
          <h1
            className="num-display font-black leading-none text-[var(--color-text-primary)] tracking-tight"
            style={{ fontSize: 'clamp(3.5rem, 18vw, 6rem)' }}
          >
            NUMBER
            <br />
            <span className="text-[var(--color-accent)]">HUNT</span>
          </h1>
          <p className="mt-3 text-[var(--color-text-secondary)] font-medium text-sm tracking-wide">
            How fast can you find them? Beat the clock.
          </p>
        </div>

        <Link to="/levels" className="w-full" tabIndex={-1}>
          <Button variant="primary" size="lg" fullWidth id="play-now-btn">
            ▶ PLAY NOW
          </Button>
        </Link>
      </section>

      {/* ── YOUR PROGRESS & STREAK ───────────────── */}
      <Card className="mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="label-tag">YOUR PROGRESS</span>
              <div className="num-display text-xl font-black text-[var(--color-text-primary)] mt-0.5">
                {unlockedCount} / 16 <span className="text-xs font-bold text-[var(--color-text-muted)]">LEVELS</span>
              </div>
            </div>
            <div className="text-right">
              <span className="label-tag">STARS</span>
              <div className="num-display text-xl font-black text-amber-500 mt-0.5">
                ⭐ {totalStars} / 48
              </div>
            </div>
          </div>

          {streak.currentStreak > 0 && (
            <div className="pt-2.5 border-t border-[var(--color-border)] flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--color-text-secondary)] flex items-center gap-1.5">
                <span>🔥</span>
                <span>{streak.currentStreak} DAY STREAK</span>
              </span>
              <span className="text-[var(--color-text-muted)] text-[0.7rem]">
                BEST: {streak.longestStreak} DAYS
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* ── PERSONAL BESTS GRID ──────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card padding="md" className="flex flex-col gap-1">
          <span className="label-tag">BEST TIME</span>
          <span className="num-display text-2xl font-black text-[var(--color-accent)] leading-none">
            {bestDisplay}
          </span>
        </Card>
        <Card padding="md" className="flex flex-col gap-1">
          <span className="label-tag">BEST SCORE</span>
          <span className="num-display text-2xl font-black text-[var(--color-text-primary)] leading-none">
            {stats && stats.bestScore > 0 ? formatScore(stats.bestScore) : '—'}
          </span>
        </Card>
      </div>

      {/* ── QUICK ACCESS ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to="/leaderboard" tabIndex={-1}>
          <Card hoverable padding="md" className="flex flex-col gap-1.5 h-full">
            <span className="text-xl">🏆</span>
            <span className="font-bold text-sm text-[var(--color-text-primary)]">Leaderboard</span>
            <span className="text-xs text-[var(--color-text-muted)]">Global rankings</span>
          </Card>
        </Link>
        <Link to="/profile" tabIndex={-1}>
          <Card hoverable padding="md" className="flex flex-col gap-1.5 h-full">
            <span className="text-xl">👤</span>
            <span className="font-bold text-sm text-[var(--color-text-primary)]">Profile</span>
            <span className="text-xs text-[var(--color-text-muted)]">Achievements & Stats</span>
          </Card>
        </Link>
      </div>

      {/* ── GAME INFO STRIP ───────────────────────── */}
      <Card padding="md">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="num-display text-3xl font-black text-[var(--color-accent)]">16</div>
            <div className="label-tag mt-0.5">LEVELS</div>
          </div>
          <div className="w-px h-10 bg-[var(--color-border)]" aria-hidden="true" />
          <div className="text-center">
            <div className="num-display text-3xl font-black text-[var(--color-text-primary)]">5</div>
            <div className="label-tag mt-0.5">MIN NUMBERS</div>
          </div>
          <div className="w-px h-10 bg-[var(--color-border)]" aria-hidden="true" />
          <div className="text-center">
            <div className="num-display text-3xl font-black text-[var(--color-text-primary)]">20</div>
            <div className="label-tag mt-0.5">MAX NUMBERS</div>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
