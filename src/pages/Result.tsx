import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ScoreDisplay } from '../components/game/ScoreDisplay';
import { StarRating } from '../components/common/StarRating';
import { AchievementToast } from '../components/common/AchievementToast';
import { formatTimeMs } from '../utils/scoring';
import { getTotalStars } from '../utils/storage';
import type { GameResult } from '../types/game';

interface StatItemProps {
  label: string;
  value: string;
  accent?: boolean;
}

function StatItem({ label, value, accent = false }: StatItemProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-4 flex-1">
      <span className="label-tag">{label}</span>
      <span
        className={[
          'num-display text-2xl font-black leading-none',
          accent ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}

export function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const result = (location.state as { result?: GameResult } | null)?.result;

  // Handle case where result is accessed directly without playing
  if (!result) {
    return (
      <PageContainer maxWidth="max-w-sm">
        <Card className="text-center p-6 my-10">
          <span className="text-4xl mb-3 block">🎯</span>
          <h2 className="text-xl font-black text-[var(--color-text-primary)] mb-2">
            No Game Completed Yet
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Play a level to see your speed, accuracy, stars, and score stats!
          </p>
          <Link to="/levels">
            <Button variant="primary" size="md" fullWidth>
              CHOOSE A LEVEL →
            </Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  const isLastLevel = result.level.id >= 16;
  const isPerfect = result.mistakes === 0;
  const totalStars = getTotalStars();

  const handleNextLevel = () => {
    if (isLastLevel) {
      navigate('/levels');
    } else {
      navigate('/game', { state: { levelId: result.level.id + 1 } });
    }
  };

  const handlePlayAgain = () => {
    navigate('/game', { state: { levelId: result.level.id } });
  };

  const handleShare = async () => {
    const starString = '⭐'.repeat(Math.max(1, result.stars));
    const text = `🎯 NUMBER HUNT\n\nLevel ${result.level.id} — ${result.level.numberCount} Numbers\n⏱ ${formatTimeMs(result.timeMs)}\n❌ ${result.mistakes} mistakes\n🎯 ${result.accuracy}% accuracy\n⭐ ${starString}\n\nCan you beat me?\n\nNumber Hunt`;

    // Try native Web Share if supported on mobile devices
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Number Hunt Result',
          text,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        alert(text);
      }
    } catch {
      alert(text);
    }
  };

  return (
    <PageContainer maxWidth="max-w-sm">
      {/* ── TOAST NOTIFICATION FOR UNLOCKED ACHIEVEMENTS ── */}
      {result.newlyUnlockedAchievements && result.newlyUnlockedAchievements.length > 0 && (
        <AchievementToast achievementIds={result.newlyUnlockedAchievements} />
      )}

      {/* ── RESULT HEADER ─────────────────── */}
      <div className="text-center mb-5">
        <div className="label-tag text-[var(--color-success)] mb-1">
          {isPerfect ? '🌟 PERFECT RUN · LEVEL COMPLETE' : 'LEVEL COMPLETE'}
        </div>
        <h1 className="num-display text-5xl font-black text-[var(--color-text-primary)] leading-none">
          {result.level.id}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Level {result.level.id} · {result.level.numberCount} numbers
        </p>

        {/* ── ANIMATED STAR RATING ─────────── */}
        <div className="mt-3">
          <StarRating stars={result.stars} size="lg" animate />
        </div>
      </div>

      {/* ── BADGES STRIP ──────────────────── */}
      <div className="flex flex-col gap-2 mb-4">
        {result.isPersonalBest && (
          <div className="bg-[var(--color-accent-light)] border border-[var(--color-accent)] rounded-xl p-3 flex items-center gap-3 animate-scale-in">
            <span className="text-2xl">🏆</span>
            <div>
              <div className="font-black text-sm text-[var(--color-accent)] tracking-wide">
                NEW PERSONAL BEST
              </div>
              <div className="text-xs text-[var(--color-text-muted)]">
                Your fastest time on this level!
              </div>
            </div>
          </div>
        )}

        {isPerfect && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 flex items-center gap-2.5">
            <span className="text-xl">🎯</span>
            <div className="text-xs font-bold text-emerald-800">
              PERFECT RUN — 0 mistakes made!
            </div>
          </div>
        )}
      </div>

      {/* ── STATS GRID ────────────────────── */}
      <Card padding="none" className="mb-4 overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--color-border)]">
          <StatItem label="TIME" value={formatTimeMs(result.timeMs)} accent />
          <StatItem label="MISTAKES" value={String(result.mistakes)} />
          <StatItem label="ACCURACY" value={`${result.accuracy}%`} />
          <div className="flex flex-col items-center gap-1 py-4 flex-1 col-span-1">
            <ScoreDisplay score={result.score} size="md" />
          </div>
        </div>
      </Card>

      {/* ── OVERALL STAR PROGRESS MINI BAR ── */}
      <div className="mb-5 px-1 flex items-center justify-between text-xs text-[var(--color-text-muted)] font-semibold">
        <span>TOTAL STARS COLLECTED</span>
        <span className="font-black text-[var(--color-text-primary)]">
          ⭐ {totalStars} / 48
        </span>
      </div>

      {/* ── ACTIONS ───────────────────────── */}
      <div className="flex flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          id="next-level-btn"
          onClick={handleNextLevel}
        >
          {isLastLevel ? 'ALL LEVELS COMPLETED! 🎉' : 'NEXT LEVEL →'}
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          id="play-again-btn"
          onClick={handlePlayAgain}
        >
          ↺ PLAY AGAIN
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          id="share-result-btn"
          onClick={handleShare}
        >
          {copied ? '✓ COPIED TO CLIPBOARD' : '↗ SHARE RESULT'}
        </Button>
      </div>

      {/* ── NAV LINKS ─────────────────────── */}
      <div className="flex justify-center gap-4 mt-6">
        <Link
          to="/levels"
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          All Levels
        </Link>
        <Link
          to="/profile"
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          View Profile & Achievements
        </Link>
      </div>
    </PageContainer>
  );
}
