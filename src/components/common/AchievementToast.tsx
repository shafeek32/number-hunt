import { useState, useEffect } from 'react';
import { getAchievementById } from '../../data/achievements';

interface AchievementToastProps {
  achievementIds: string[];
  onDismiss?: () => void;
}

export function AchievementToast({ achievementIds, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (achievementIds.length === 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 6000);
    return () => clearTimeout(timer);
  }, [achievementIds, onDismiss]);

  if (!visible || achievementIds.length === 0) return null;

  const achievements = achievementIds
    .map(getAchievementById)
    .filter(Boolean);

  if (achievements.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-scale-in"
    >
      <div className="bg-[var(--color-surface)] border-2 border-[var(--color-accent)] rounded-2xl p-4 shadow-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black tracking-widest text-[var(--color-accent)] uppercase">
            <span>🏆</span>
            <span>ACHIEVEMENT UNLOCKED</span>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              onDismiss?.();
            }}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] font-bold cursor-pointer p-1"
            aria-label="Dismiss achievement notification"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {achievements.map((ach) => (
            <div key={ach!.id} className="flex items-center gap-3">
              <span className="text-2xl p-1.5 bg-[var(--color-accent-light)] rounded-xl">
                {ach!.icon}
              </span>
              <div>
                <div className="font-black text-sm text-[var(--color-text-primary)]">
                  {ach!.title}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {ach!.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
