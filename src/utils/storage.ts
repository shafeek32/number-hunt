/**
 * LocalStorage persistence for Number Hunt.
 * Manages unlocked levels, personal bests, stars, streaks, and achievements.
 */

import type { StreakData } from '../types/game';

const STORAGE_KEYS = {
  UNLOCKED_LEVELS: 'nh_unlocked_levels',
  LEVEL_BESTS: 'nh_level_bests',
  PLAYER_STATS: 'nh_player_stats',
  ACHIEVEMENTS: 'numberHuntAchievements',
  STREAK: 'nh_streak_data',
} as const;

export interface StoredLevelBest {
  timeMs: number;
  score: number;
  mistakes: number;
  accuracy: number;
  stars: number;
  timestamp: number;
}

export interface StoredPlayerStats {
  totalGames: number;
  perfectGames: number;
  bestScore: number;
  bestTimeMs: number | null;
  consecutivePerfectGames: number;
}

const DEFAULT_PLAYER_STATS: StoredPlayerStats = {
  totalGames: 0,
  perfectGames: 0,
  bestScore: 0,
  bestTimeMs: null,
  consecutivePerfectGames: 0,
};

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage might be unavailable or full in private mode
  }
}

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── UNLOCKED LEVELS ──────────────────────────────────────────────
export function getUnlockedLevels(): number[] {
  const data = safeGetItem(STORAGE_KEYS.UNLOCKED_LEVELS);
  if (!data) return [1];
  try {
    const parsed = JSON.parse(data) as number[];
    if (Array.isArray(parsed) && parsed.includes(1)) {
      return parsed;
    }
    return [1, ...(Array.isArray(parsed) ? parsed : [])];
  } catch {
    return [1];
  }
}

export function isLevelUnlocked(levelId: number): boolean {
  if (levelId === 1) return true;
  const unlocked = getUnlockedLevels();
  return unlocked.includes(levelId);
}

export function unlockLevel(levelId: number): void {
  const current = getUnlockedLevels();
  if (!current.includes(levelId)) {
    const updated = [...current, levelId].sort((a, b) => a - b);
    safeSetItem(STORAGE_KEYS.UNLOCKED_LEVELS, JSON.stringify(updated));
  }
}

// ─── LEVEL BESTS & STARS ──────────────────────────────────────────
export function getLevelBests(): Record<number, StoredLevelBest> {
  const data = safeGetItem(STORAGE_KEYS.LEVEL_BESTS);
  if (!data) return {};
  try {
    const raw = JSON.parse(data) as Record<string, Partial<StoredLevelBest>>;
    const normalized: Record<number, StoredLevelBest> = {};
    for (const [key, val] of Object.entries(raw)) {
      const numKey = Number(key);
      if (!isNaN(numKey) && val) {
        normalized[numKey] = {
          timeMs: val.timeMs ?? 0,
          score: val.score ?? 0,
          mistakes: val.mistakes ?? 0,
          accuracy: val.accuracy ?? 100,
          stars: val.stars ?? 1,
          timestamp: val.timestamp ?? Date.now(),
        };
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

export function getLevelBest(levelId: number): StoredLevelBest | null {
  const bests = getLevelBests();
  return bests[levelId] ?? null;
}

/** Get total stars earned across all completed levels */
export function getTotalStars(): number {
  const bests = getLevelBests();
  return Object.values(bests).reduce((sum, b) => sum + (b.stars ?? 0), 0);
}

// ─── PLAYER STATS ─────────────────────────────────────────────────
export function getStoredPlayerStats(): StoredPlayerStats {
  const data = safeGetItem(STORAGE_KEYS.PLAYER_STATS);
  if (!data) return DEFAULT_PLAYER_STATS;
  try {
    const parsed = JSON.parse(data);
    return {
      totalGames: parsed.totalGames ?? 0,
      perfectGames: parsed.perfectGames ?? 0,
      bestScore: parsed.bestScore ?? 0,
      bestTimeMs: parsed.bestTimeMs ?? null,
      consecutivePerfectGames: parsed.consecutivePerfectGames ?? 0,
    };
  } catch {
    return DEFAULT_PLAYER_STATS;
  }
}

// ─── STREAKS ──────────────────────────────────────────────────────
export function getStreakData(): StreakData {
  const data = safeGetItem(STORAGE_KEYS.STREAK);
  if (!data) {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
  }
  try {
    const parsed = JSON.parse(data);
    return {
      currentStreak: parsed.currentStreak ?? 0,
      longestStreak: parsed.longestStreak ?? 0,
      lastPlayedDate: parsed.lastPlayedDate ?? null,
    };
  } catch {
    return { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
  }
}

export function updateStreak(): StreakData {
  const streak = getStreakData();
  const today = getTodayDateString();

  if (streak.lastPlayedDate === today) {
    return streak;
  }

  const yesterday = getYesterdayDateString();
  let newCurrent = 1;
  if (streak.lastPlayedDate === yesterday) {
    newCurrent = streak.currentStreak + 1;
  }

  const newLongest = Math.max(streak.longestStreak, newCurrent);
  const updated: StreakData = {
    currentStreak: newCurrent,
    longestStreak: newLongest,
    lastPlayedDate: today,
  };
  safeSetItem(STORAGE_KEYS.STREAK, JSON.stringify(updated));
  return updated;
}

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────
export function getUnlockedAchievements(): string[] {
  const data = safeGetItem(STORAGE_KEYS.ACHIEVEMENTS);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function evaluateAchievements(params: {
  levelId: number;
  timeMs: number;
  mistakes: number;
  stars: number;
  totalGames: number;
  totalStars: number;
  consecutivePerfectGames: number;
  bests: Record<number, StoredLevelBest>;
}): string[] {
  const {
    levelId,
    timeMs,
    mistakes,
    totalGames,
    totalStars,
    consecutivePerfectGames,
    bests,
  } = params;

  const currentUnlocked = getUnlockedAchievements();
  const newlyUnlocked: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !currentUnlocked.includes(id)) {
      newlyUnlocked.push(id);
    }
  };

  // 1. First Hunt
  check('first-hunt', totalGames >= 1);

  // 2. Perfect Hunt
  check('perfect-hunt', mistakes === 0);

  // 3. Speed Hunter: under 5 seconds
  check('speed-hunter', timeMs < 5000);

  // 4. Level 5: Reach/Complete level 5
  check('level-5', levelId >= 5 || bests[5] !== undefined);

  // 5. Level 10: Reach/Complete level 10
  check('level-10', levelId >= 10 || bests[10] !== undefined);

  // 6. Level 16: Complete final level
  check('level-16', levelId === 16 || bests[16] !== undefined);

  // 7. Star Collector: at least 10 stars
  check('star-collector', totalStars >= 10);

  // 8. Three Star Hunter: 5 three-star completions
  const threeStarCount = Object.values(bests).filter((b) => b.stars === 3).length;
  check('three-star-hunter', threeStarCount >= 5);

  // 9. No Mistake Streak: 3 consecutive games without mistakes
  check('no-mistake-streak', consecutivePerfectGames >= 3);

  // 10. Hunter: Play 10 games
  check('hunter', totalGames >= 10);

  if (newlyUnlocked.length > 0) {
    const updated = [...currentUnlocked, ...newlyUnlocked];
    safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(updated));
  }

  return newlyUnlocked;
}

// ─── GAME COMPLETION FLOW ─────────────────────────────────────────
export function recordGameCompletion(params: {
  levelId: number;
  timeMs: number;
  score: number;
  mistakes: number;
  accuracy: number;
  stars: number;
}): {
  isPersonalBest: boolean;
  isNewRecord: boolean;
  stars: number;
  newlyUnlockedAchievements: string[];
} {
  const { levelId, timeMs, score, mistakes, accuracy, stars } = params;

  // 1. Update streak
  updateStreak();

  // 2. Personal best & Star check
  const bests = getLevelBests();
  const prevBest = bests[levelId];
  let isPersonalBest = false;

  if (!prevBest) {
    isPersonalBest = true;
  } else if (timeMs < prevBest.timeMs || (timeMs === prevBest.timeMs && score > prevBest.score)) {
    isPersonalBest = true;
  }

  // Preserve highest stars achieved, lowest time, highest score
  const finalStars = prevBest ? Math.max(prevBest.stars ?? 1, stars) : stars;
  const finalTimeMs = prevBest ? Math.min(prevBest.timeMs, timeMs) : timeMs;
  const finalScore = prevBest ? Math.max(prevBest.score, score) : score;
  const finalMistakes = prevBest ? Math.min(prevBest.mistakes ?? mistakes, mistakes) : mistakes;
  const finalAccuracy = prevBest ? Math.max(prevBest.accuracy ?? accuracy, accuracy) : accuracy;

  bests[levelId] = {
    timeMs: finalTimeMs,
    score: finalScore,
    mistakes: finalMistakes,
    accuracy: finalAccuracy,
    stars: finalStars,
    timestamp: Date.now(),
  };
  safeSetItem(STORAGE_KEYS.LEVEL_BESTS, JSON.stringify(bests));

  // 3. Unlock next level (up to 16)
  if (levelId < 16) {
    unlockLevel(levelId + 1);
  }

  // 4. Update player stats
  const stats = getStoredPlayerStats();
  const nextConsecutivePerfect = mistakes === 0 ? stats.consecutivePerfectGames + 1 : 0;
  const updatedStats: StoredPlayerStats = {
    totalGames: stats.totalGames + 1,
    perfectGames: mistakes === 0 ? stats.perfectGames + 1 : stats.perfectGames,
    bestScore: Math.max(stats.bestScore, score),
    bestTimeMs:
      stats.bestTimeMs === null
        ? timeMs
        : Math.min(stats.bestTimeMs, timeMs),
    consecutivePerfectGames: nextConsecutivePerfect,
  };
  safeSetItem(STORAGE_KEYS.PLAYER_STATS, JSON.stringify(updatedStats));

  // 5. Calculate total stars & evaluate achievements
  const totalStars = Object.values(bests).reduce((sum, b) => sum + (b.stars ?? 0), 0);
  const newlyUnlockedAchievements = evaluateAchievements({
    levelId,
    timeMs,
    mistakes,
    stars: finalStars,
    totalGames: updatedStats.totalGames,
    totalStars,
    consecutivePerfectGames: nextConsecutivePerfect,
    bests,
  });

  return {
    isPersonalBest,
    isNewRecord: isPersonalBest,
    stars,
    newlyUnlockedAchievements,
  };
}

/**
 * Resets local storage progress to start fresh (e.g. Level 1).
 */
export function resetLocalProgress(highestLevel = 1): void {
  const levels = Array.from({ length: Math.max(1, highestLevel) }, (_, i) => i + 1);
  safeSetItem(STORAGE_KEYS.UNLOCKED_LEVELS, JSON.stringify(levels));
  safeSetItem(STORAGE_KEYS.LEVEL_BESTS, JSON.stringify({}));
  safeSetItem(STORAGE_KEYS.PLAYER_STATS, JSON.stringify(DEFAULT_PLAYER_STATS));
  safeSetItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify([]));
  safeSetItem(STORAGE_KEYS.STREAK, JSON.stringify({ currentStreak: 0, longestStreak: 0, lastPlayedDate: null }));
}

/**
 * Synchronize cloud account records into local storage.
 */
export function syncCloudToStorage(
  cloudStats: { highest_level?: number; total_stars?: number } | null,
  cloudGames?: Array<{ level_id: number; score: number; time_ms: number; mistakes: number; accuracy: number; stars: number }>
): void {
  const highest = Math.max(1, cloudStats?.highest_level || 1);
  const levels = Array.from({ length: highest }, (_, i) => i + 1);
  safeSetItem(STORAGE_KEYS.UNLOCKED_LEVELS, JSON.stringify(levels));

  if (cloudGames && cloudGames.length > 0) {
    const bests: Record<number, StoredLevelBest> = {};
    for (const g of cloudGames) {
      if (!bests[g.level_id] || g.score > bests[g.level_id].score) {
        bests[g.level_id] = {
          timeMs: g.time_ms,
          score: g.score,
          mistakes: g.mistakes,
          accuracy: Number(g.accuracy),
          stars: g.stars,
          timestamp: Date.now(),
        };
      }
    }
    safeSetItem(STORAGE_KEYS.LEVEL_BESTS, JSON.stringify(bests));
  } else if (!cloudStats || cloudStats.highest_level === 1) {
    safeSetItem(STORAGE_KEYS.LEVEL_BESTS, JSON.stringify({}));
  }
}

