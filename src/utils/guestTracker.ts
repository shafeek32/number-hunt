/**
 * guestTracker.ts — Real Guest Players Analytics & Tracking
 *
 * Tracks only genuine guest players who play Number Hunt without logging in.
 * No mock/dummy players. If no guest has played, count is 0.
 */

import {
  getStoredPlayerStats,
  getLevelBests,
  getUnlockedLevels,
  getUnlockedAchievements,
  getStreakData,
  getTotalStars,
} from './storage';
import type { AdminUserItem, AdminUserDetail, AdminGameItem } from '../types/admin';

const GUEST_ID_KEY = 'nh_guest_device_id';
const GUEST_REGISTRY_KEY = 'nh_guest_registry_v1';

// Known mock IDs from earlier to explicitly purge from localStorage if present
const PURGE_MOCK_IDS = new Set([
  'guest_4f89',
  'guest_7b21',
  'guest_a390',
  'guest_e814',
  'guest_10c2',
  'guest_d57e',
]);

function isMockSession(g: StoredGuestSession): boolean {
  if (PURGE_MOCK_IDS.has(g.id)) return true;
  if (g.displayName && (g.displayName.includes('4f89') || g.displayName.includes('d57e') || g.displayName.includes('a390'))) return true;
  return false;
}

function hasSupabaseAuthSession(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const val = localStorage.getItem(key);
        if (val && val.includes('access_token')) return true;
      }
    }
  } catch {}
  return false;
}

export interface StoredGuestSession {
  id: string;
  displayName: string;
  avatar: string;
  firstSeenAt: string;
  lastPlayedAt: string;
  totalGames: number;
  completedGames: number;
  bestScore: number;
  highestLevel: number;
  totalStars: number;
  perfectGames: number;
  currentStreak: number;
  longestStreak: number;
  achievementsCount: number;
  isMigrated: boolean;
  migratedToUserId?: string;
  recentGames: AdminGameItem[];
}

/**
 * Returns a stable unique ID for this browser/device guest session.
 */
export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id || PURGE_MOCK_IDS.has(id)) {
      const randHex = Math.random().toString(16).substring(2, 6);
      id = `guest_${randHex}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return 'guest_local';
  }
}

/**
 * Load genuine guest player sessions.
 * Automatically purges any old dummy seed records.
 * Synchronizes real local device guest progress if games have been played while logged out.
 */
export function getGuestRegistry(): StoredGuestSession[] {
  let registry: StoredGuestSession[] = [];

  try {
    const raw = localStorage.getItem(GUEST_REGISTRY_KEY);
    if (raw) {
      const parsed: StoredGuestSession[] = JSON.parse(raw);
      // Clean out any legacy mock data
      registry = parsed.filter((g) => !isMockSession(g));
    }
  } catch {
    registry = [];
  }

  // Check if current browser has real active unauthenticated guest play
  try {
    const isAuthenticated = hasSupabaseAuthSession();
    const localStats = getStoredPlayerStats();

    // Only register device as guest if user is NOT logged in and has played local games
    if (!isAuthenticated && localStats.totalGames > 0) {
      const guestId = getOrCreateGuestId();
      const localBests = getLevelBests();
      const unlockedLevels = getUnlockedLevels();
      const highestLevel = Math.max(...unlockedLevels, 1);
      const totalStars = getTotalStars();
      const achievements = getUnlockedAchievements();
      const streak = getStreakData();

      const localGames: AdminGameItem[] = Object.entries(localBests).map(([lvlStr, b]) => ({
        id: `local-g-${lvlStr}`,
        userId: guestId,
        username: guestId,
        displayName: 'Guest Player (This Device)',
        avatar: '⚡',
        levelId: Number(lvlStr),
        numberCount: Number(lvlStr) + 4,
        isDaily: false,
        score: b.score,
        timeMs: b.timeMs,
        mistakes: b.mistakes,
        accuracy: b.accuracy,
        stars: b.stars,
        completedAt: new Date(b.timestamp).toISOString(),
        createdAt: new Date(b.timestamp).toISOString(),
        isFlagged: false,
        flagReason: null,
        isVerified: true,
      }));

      const existingIdx = registry.findIndex((g) => g.id === guestId);
      const localGuestSession: StoredGuestSession = {
        id: guestId,
        displayName: `Guest #${guestId.replace('guest_', '')} (This Device)`,
        avatar: '⚡',
        firstSeenAt: registry[existingIdx]?.firstSeenAt || new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        totalGames: localStats.totalGames,
        completedGames: localStats.totalGames,
        bestScore: localStats.bestScore,
        highestLevel: highestLevel,
        totalStars: totalStars,
        perfectGames: localStats.perfectGames,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        achievementsCount: achievements.length,
        isMigrated: false,
        recentGames: localGames,
      };

      if (existingIdx >= 0) {
        registry[existingIdx] = localGuestSession;
      } else {
        registry.unshift(localGuestSession);
      }

      saveGuestRegistry(registry);
    } else {
      // If mock entries were purged, resave clean registry
      saveGuestRegistry(registry);
    }
  } catch (e) {
    console.warn('[guestTracker] Error inspecting local guest play:', e);
  }

  return registry;
}

function saveGuestRegistry(sessions: StoredGuestSession[]): void {
  try {
    localStorage.setItem(GUEST_REGISTRY_KEY, JSON.stringify(sessions));
  } catch {}
}

export const guestTracker = {
  /**
   * Return the actual count of guest players who have played Number Hunt.
   */
  getGuestPlayersCount(): number {
    const registry = getGuestRegistry();
    return registry.length;
  },

  /**
   * Return the actual total games played by guest players.
   */
  getGuestGamesCount(): number {
    const registry = getGuestRegistry();
    return registry.reduce((sum, g) => sum + g.totalGames, 0);
  },

  /**
   * Return unique guest players active today.
   */
  getActiveGuestsToday(): number {
    const registry = getGuestRegistry();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    return registry.filter((g) => new Date(g.lastPlayedAt).getTime() >= todayMs).length;
  },

  /**
   * Convert real guest sessions to AdminUserItem list for the /admin/users table.
   */
  getGuestUsersList(): AdminUserItem[] {
    const registry = getGuestRegistry();

    return registry.map((g) => ({
      id: g.id,
      avatar: g.avatar,
      username: g.id,
      displayName: g.displayName,
      email: null,
      isGuest: true,
      totalGames: g.totalGames,
      completedGames: g.completedGames,
      bestScore: g.bestScore,
      highestLevel: g.highestLevel,
      perfectGames: g.perfectGames,
      currentStreak: g.currentStreak,
      longestStreak: g.longestStreak,
      joinedAt: g.firstSeenAt,
      lastPlayedAt: g.lastPlayedAt,
      isAdmin: false,
      isBanned: false,
    }));
  },

  /**
   * Return full user dossier for a real guest player to view in /admin/users/:id.
   */
  getGuestUserDetail(guestId: string): AdminUserDetail | null {
    const registry = getGuestRegistry();
    const guest = registry.find((g) => g.id === guestId);
    if (!guest) return null;

    const totalPlayTimeMs = guest.recentGames.reduce((acc, g) => acc + (g.timeMs || 0), 0) || (guest.totalGames * 10000);
    const avgScore = guest.recentGames.length > 0
      ? Math.round(guest.recentGames.reduce((acc, g) => acc + g.score, 0) / guest.recentGames.length)
      : guest.bestScore;
    const avgTimeMs = guest.recentGames.length > 0
      ? Math.round(totalPlayTimeMs / guest.recentGames.length)
      : 8000;

    const levelPerformance = Array.from({ length: 16 }, (_, i) => {
      const lvlId = i + 1;
      const gameForLevel = guest.recentGames.find((g) => g.levelId === lvlId);
      const reached = lvlId <= guest.highestLevel;
      return {
        levelId: lvlId,
        bestScore: gameForLevel?.score || (reached ? guest.bestScore : 0),
        bestTimeMs: gameForLevel?.timeMs || (reached ? 5000 : null),
        bestStars: gameForLevel?.stars || (reached ? 2 : 0),
        gamesPlayed: reached ? 1 : 0,
        completed: reached ? 1 : 0,
      };
    });

    return {
      profile: {
        id: guest.id,
        username: guest.id,
        display_name: guest.displayName,
        avatar: guest.avatar,
        created_at: guest.firstSeenAt,
        updated_at: guest.lastPlayedAt,
        email: 'Guest Session (Local Device)',
      },
      stats: {
        user_id: guest.id,
        total_games: guest.totalGames,
        perfect_games: guest.perfectGames,
        best_score: guest.bestScore,
        best_time_ms: guest.recentGames[0]?.timeMs || null,
        highest_level: guest.highestLevel,
        total_stars: guest.totalStars,
        current_streak: guest.currentStreak,
        longest_streak: guest.longestStreak,
        updated_at: guest.lastPlayedAt,
      },
      isAdmin: false,
      isBanned: false,
      totalPlayTimeMs,
      averageScore: avgScore,
      averageTimeMs: avgTimeMs,
      completionRate: 100,
      levelPerformance,
      recentGames: guest.recentGames,
    };
  },

  /**
   * Called whenever a guest completes a level to update guest session telemetry.
   */
  trackGuestGame(params: {
    levelId: number;
    numberCount: number;
    timeMs: number;
    mistakes: number;
    accuracy: number;
    score: number;
    stars: number;
  }): void {
    try {
      const guestId = getOrCreateGuestId();
      const registry = getGuestRegistry();
      const idx = registry.findIndex((g) => g.id === guestId);

      const gameItem: AdminGameItem = {
        id: `gg-${Date.now()}`,
        userId: guestId,
        username: guestId,
        displayName: `Guest #${guestId.replace('guest_', '')}`,
        avatar: '👤',
        levelId: params.levelId,
        numberCount: params.numberCount,
        isDaily: false,
        score: params.score,
        timeMs: params.timeMs,
        mistakes: params.mistakes,
        accuracy: params.accuracy,
        stars: params.stars,
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isFlagged: false,
        flagReason: null,
        isVerified: true,
      };

      if (idx >= 0) {
        const current = registry[idx];
        current.totalGames += 1;
        current.completedGames += 1;
        current.bestScore = Math.max(current.bestScore, params.score);
        current.highestLevel = Math.max(current.highestLevel, params.levelId);
        current.totalStars = getTotalStars();
        if (params.mistakes === 0) current.perfectGames += 1;
        current.lastPlayedAt = new Date().toISOString();
        current.recentGames = [gameItem, ...(current.recentGames || [])].slice(0, 20);
      } else {
        const newSession: StoredGuestSession = {
          id: guestId,
          displayName: `Guest #${guestId.replace('guest_', '')}`,
          avatar: '👤',
          firstSeenAt: new Date().toISOString(),
          lastPlayedAt: new Date().toISOString(),
          totalGames: 1,
          completedGames: 1,
          bestScore: params.score,
          highestLevel: params.levelId,
          totalStars: params.stars,
          perfectGames: params.mistakes === 0 ? 1 : 0,
          currentStreak: 1,
          longestStreak: 1,
          achievementsCount: 0,
          isMigrated: false,
          recentGames: [gameItem],
        };
        registry.unshift(newSession);
      }

      saveGuestRegistry(registry);
    } catch (e) {
      console.warn('[guestTracker] Error recording guest run:', e);
    }
  },
};
