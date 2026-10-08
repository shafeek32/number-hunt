import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './Button';
import { Card } from './Card';
import { useAuth } from '../../hooks/useAuth';
import { getTotalStars, getStoredPlayerStats, getUnlockedAchievements, getStreakData } from '../../utils/storage';
import { formatScore } from '../../utils/scoring';

export function MigrationModal() {
  const { hasLocalProgressToMigrate, migrateLocalProgress, dismissMigration } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const location = useLocation();

  if (location.pathname.startsWith('/admin') || !hasLocalProgressToMigrate) return null;

  const totalStars = getTotalStars();
  const stats = getStoredPlayerStats();
  const achievements = getUnlockedAchievements();
  const streak = getStreakData();

  const handleSave = async () => {
    setMigrating(true);
    setStatusMessage('Syncing local records to your cloud profile...');
    const success = await migrateLocalProgress();
    setMigrating(false);
    if (success) {
      setStatusMessage('✓ Progress successfully saved to your account!');
      setTimeout(() => {
        dismissMigration();
      }, 1200);
    } else {
      setStatusMessage('Failed to save to cloud. Your local progress is still safe.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
    >
      <Card className="w-full max-w-sm p-6 flex flex-col gap-4 shadow-2xl border-2 border-[var(--color-accent)] animate-scale-in">
        <div className="text-center">
          <span className="text-3xl mb-1 block">☁️</span>
          <h2 id="migration-title" className="text-xl font-black text-[var(--color-text-primary)] tracking-wide">
            SAVE YOUR PROGRESS
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            We found local Number Hunt progress on this device. Would you like to merge it into your account?
          </p>
        </div>

        {/* Progress summary box */}
        <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-3 flex flex-col gap-2 text-xs font-bold">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">STARS</span>
            <span className="text-amber-500">⭐ {totalStars} Stars</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-muted)]">ACHIEVEMENTS</span>
            <span className="text-[var(--color-text-primary)]">🏆 {achievements.length} Unlocked</span>
          </div>
          {streak.currentStreak > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">STREAK</span>
              <span className="text-[var(--color-accent)]">🔥 {streak.currentStreak} Day streak</span>
            </div>
          )}
          {stats.bestScore > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]">BEST SCORE</span>
              <span className="text-[var(--color-text-primary)]">{formatScore(stats.bestScore)}</span>
            </div>
          )}
        </div>

        {statusMessage && (
          <div className="text-xs text-center font-bold text-[var(--color-accent)]">
            {statusMessage}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-1">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={handleSave}
            disabled={migrating}
          >
            {migrating ? 'SAVING...' : 'SAVE TO ACCOUNT'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={dismissMigration}
            disabled={migrating}
          >
            START FRESH / KEEP LOCAL
          </Button>
        </div>
      </Card>
    </div>
  );
}
