import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { StarRating } from '../components/common/StarRating';
import { LEVELS, formatTime, getDifficultyLabel } from '../data/levels';
import {
  getUnlockedLevels,
  getLevelBests,
  getTotalStars,
  type StoredLevelBest,
} from '../utils/storage';

import { useAuth } from '../hooks/useAuth';

export function LevelSelect() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unlockedLevels, setUnlockedLevels] = useState<number[]>([1]);
  const [levelBests, setLevelBests] = useState<Record<number, StoredLevelBest>>({});
  const [totalStars, setTotalStars] = useState(0);

  useEffect(() => {
    setUnlockedLevels(getUnlockedLevels());
    setLevelBests(getLevelBests());
    setTotalStars(getTotalStars());
  }, [user]);

  const handlePlay = (levelId: number, isUnlocked: boolean) => {
    if (isUnlocked) {
      navigate('/game', { state: { levelId } });
    }
  };

  const unlockedCount = unlockedLevels.length;
  const completedCount = Object.keys(levelBests).length;
  const progressPct = Math.round((unlockedCount / 16) * 100);

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* ── HEADER & OVERALL PROGRESS ──────────── */}
      <div className="mb-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black tracking-widest uppercase text-[var(--color-text-primary)]">
            Choose Your Level
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Complete levels to unlock the next · {completedCount} / 16 cleared
          </p>
        </div>

        {/* ── PROGRESS STRIP ─────────────────────── */}
        <div className="card p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="label-tag">LEVEL PROGRESS</span>
            <div className="flex items-center gap-4">
              <span className="text-[var(--color-text-secondary)]">
                {unlockedCount} / 16 UNLOCKED
              </span>
              <span className="text-amber-500 font-extrabold flex items-center gap-1">
                ⭐ {totalStars} / 48
              </span>
            </div>
          </div>
          <div
            className="w-full h-2.5 rounded-full bg-[var(--color-surface-3)] overflow-hidden"
            role="progressbar"
            aria-valuenow={unlockedCount}
            aria-valuemin={1}
            aria-valuemax={16}
          >
            <div
              className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-400"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── LEVEL GRID ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {LEVELS.map((level) => {
          const isUnlocked = unlockedLevels.includes(level.id);
          const best = levelBests[level.id];
          const isCompleted = best !== undefined;
          const starsEarned = best?.stars ?? 0;
          const paddedLevelId = String(level.id).padStart(2, '0');

          return (
            <div
              key={level.id}
              onClick={() => handlePlay(level.id, isUnlocked)}
              className={[
                'card flex flex-col justify-between p-4 select-none min-h-[190px]',
                isUnlocked
                  ? 'cursor-pointer hover:shadow-[var(--shadow-md)] hover:-translate-y-1 hover:border-[var(--color-accent)] transition-all duration-200'
                  : 'opacity-55 cursor-not-allowed bg-[var(--color-surface-2)]',
              ].join(' ')}
            >
              {/* Top: Status Marker & Level Meta */}
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div>
                    <div className="label-tag text-[0.65rem]">LEVEL {paddedLevelId}</div>
                    <div className="num-display text-2xl font-black text-[var(--color-text-primary)] leading-none mt-0.5">
                      {level.numberCount}
                      <span className="text-xs font-bold text-[var(--color-text-muted)] ml-1">
                        nums
                      </span>
                    </div>
                  </div>

                  {/* Hierarchy icon: 🔒 / ○ / ✓ */}
                  <div>
                    {!isUnlocked ? (
                      <span className="text-base" aria-label="Locked">🔒</span>
                    ) : isCompleted ? (
                      <span
                        className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black"
                        aria-label="Completed"
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className="w-6 h-6 rounded-full border-2 border-[var(--color-border-strong)] flex items-center justify-center text-xs text-[var(--color-text-muted)]"
                        aria-label="Unlocked"
                      >
                        ○
                      </span>
                    )}
                  </div>
                </div>

                {/* Difficulty tag */}
                <div className="mt-2">
                  <Badge variant="difficulty" difficulty={level.difficulty}>
                    {getDifficultyLabel(level.difficulty)}
                  </Badge>
                </div>
              </div>

              {/* Middle: Performance / Lock notice */}
              <div className="my-2 min-h-[2.25rem] flex flex-col justify-center">
                {!isUnlocked ? (
                  <div className="text-[0.7rem] text-[var(--color-text-muted)] font-medium leading-tight">
                    Complete Level {level.id - 1}
                    <br />
                    to unlock
                  </div>
                ) : isCompleted ? (
                  <div className="flex flex-col gap-0.5">
                    <StarRating stars={starsEarned} size="sm" />
                    <div className="text-xs text-[var(--color-text-secondary)] font-bold mt-0.5">
                      BEST {formatTime(best.timeMs)}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)] font-bold">
                    NOT COMPLETED
                  </div>
                )}
              </div>

              {/* Bottom: Play Button */}
              <Button
                variant={isUnlocked ? 'primary' : 'secondary'}
                size="sm"
                fullWidth
                disabled={!isUnlocked}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay(level.id, isUnlocked);
                }}
                id={`play-level-${level.id}`}
                aria-label={
                  isUnlocked
                    ? isCompleted
                      ? `Replay Level ${level.id}`
                      : `Play Level ${level.id}`
                    : `Level ${level.id} locked`
                }
              >
                {!isUnlocked ? 'LOCKED' : isCompleted ? 'REPLAY' : 'PLAY'}
              </Button>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
