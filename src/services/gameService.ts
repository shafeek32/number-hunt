import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { GameRow, PlayerStatsRow } from '../types/database';

export interface SaveGameParams {
  userId: string;
  levelId: number;
  numberCount: number;
  timeMs: number;
  mistakes: number;
  accuracy: number;
  score: number;
  stars: number;
  completedAt?: string;
}

export const gameService = {
  /**
   * Save completed game to Supabase cloud.
   * Also updates aggregated player_stats.
   * Note: Server-side validation is reserved for Phase 4.
   */
  async saveGame(params: SaveGameParams): Promise<GameRow | null> {
    if (!isSupabaseConfigured) return null;

    const completedAt = params.completedAt || new Date().toISOString();

    const { data: savedGame, error } = await supabase
      .from('games')
      .insert({
        user_id: params.userId,
        level_id: params.levelId,
        number_count: params.numberCount,
        time_ms: params.timeMs,
        mistakes: params.mistakes,
        accuracy: params.accuracy,
        score: params.score,
        stars: params.stars,
        completed_at: completedAt,
      })
      .select('*')
      .single();

    if (error) {
      console.warn('Failed to upload game to Supabase:', error.message);
      return null;
    }

    // Update player_stats in cloud
    try {
      const { data: currentStats } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', params.userId)
        .maybeSingle();

      const totalGames = (currentStats?.total_games ?? 0) + 1;
      const perfectGames = (currentStats?.perfect_games ?? 0) + (params.mistakes === 0 ? 1 : 0);
      const bestScore = Math.max(currentStats?.best_score ?? 0, params.score);
      const bestTimeMs =
        currentStats?.best_time_ms === null || currentStats?.best_time_ms === undefined
          ? params.timeMs
          : Math.min(currentStats.best_time_ms, params.timeMs);
      const highestLevel = Math.max(currentStats?.highest_level ?? 1, Math.min(16, params.levelId + 1));

      // Calculate total stars across all user games in cloud
      const { data: allUserGames } = await supabase
        .from('games')
        .select('level_id, stars')
        .eq('user_id', params.userId);

      const levelStarsMap: Record<number, number> = {};
      allUserGames?.forEach((g) => {
        levelStarsMap[g.level_id] = Math.max(levelStarsMap[g.level_id] ?? 0, g.stars);
      });
      const totalStars = Object.values(levelStarsMap).reduce((a, b) => a + b, 0);

      await supabase.from('player_stats').upsert({
        user_id: params.userId,
        total_games: totalGames,
        perfect_games: perfectGames,
        best_score: bestScore,
        best_time_ms: bestTimeMs,
        highest_level: highestLevel,
        total_stars: totalStars,
        updated_at: new Date().toISOString(),
      });
    } catch (statsErr) {
      console.warn('Failed to update cloud player stats:', statsErr);
    }

    return savedGame;
  },

  /**
   * Fetch recent games history for authenticated user.
   */
  async getGameHistory(userId: string, limit = 20): Promise<GameRow[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  },

  /**
   * Fetch cloud player stats.
   */
  async getPlayerStats(userId: string): Promise<PlayerStatsRow | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  },

  /**
   * Migrate guest LocalStorage progress into cloud account on login/signup.
   * Merges safely without downgrading any existing cloud values.
   */
  async migrateLocalProgress(
    userId: string,
    localData: {
      bests: Record<number, { timeMs: number; score: number; stars: number; mistakes: number; accuracy: number }>;
      stats: { totalGames: number; perfectGames: number; bestScore: number; bestTimeMs: number | null };
      unlockedAchievements: string[];
      streak: { currentStreak: number; longestStreak: number };
      highestUnlockedLevel: number;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured) return false;

    try {
      // 1. Fetch existing cloud stats
      const { data: cloudStats } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const mergedTotalGames = Math.max(cloudStats?.total_games ?? 0, localData.stats.totalGames);
      const mergedPerfectGames = Math.max(cloudStats?.perfect_games ?? 0, localData.stats.perfectGames);
      const mergedBestScore = Math.max(cloudStats?.best_score ?? 0, localData.stats.bestScore);
      const mergedBestTimeMs =
        cloudStats?.best_time_ms && localData.stats.bestTimeMs
          ? Math.min(cloudStats.best_time_ms, localData.stats.bestTimeMs)
          : cloudStats?.best_time_ms ?? localData.stats.bestTimeMs;
      const mergedHighestLevel = Math.max(cloudStats?.highest_level ?? 1, localData.highestUnlockedLevel);
      const mergedCurrentStreak = Math.max(cloudStats?.current_streak ?? 0, localData.streak.currentStreak);
      const mergedLongestStreak = Math.max(cloudStats?.longest_streak ?? 0, localData.streak.longestStreak);

      const localStarsTotal = Object.values(localData.bests).reduce((sum, b) => sum + (b.stars ?? 0), 0);
      const mergedTotalStars = Math.max(cloudStats?.total_stars ?? 0, localStarsTotal);

      // Upsert merged stats
      await supabase.from('player_stats').upsert({
        user_id: userId,
        total_games: mergedTotalGames,
        perfect_games: mergedPerfectGames,
        best_score: mergedBestScore,
        best_time_ms: mergedBestTimeMs,
        highest_level: mergedHighestLevel,
        total_stars: mergedTotalStars,
        current_streak: mergedCurrentStreak,
        longest_streak: mergedLongestStreak,
        updated_at: new Date().toISOString(),
      });

      // 2. Upload level best games as game records if none exist
      const { data: existingGames } = await supabase
        .from('games')
        .select('level_id, score, time_ms')
        .eq('user_id', userId);

      const existingLevelIds = new Set(existingGames?.map((g) => g.level_id));

      for (const [lvlStr, best] of Object.entries(localData.bests)) {
        const levelId = Number(lvlStr);
        if (!existingLevelIds.has(levelId)) {
          await supabase.from('games').insert({
            user_id: userId,
            level_id: levelId,
            number_count: levelId + 4,
            time_ms: best.timeMs,
            mistakes: best.mistakes ?? 0,
            accuracy: best.accuracy ?? 100,
            score: best.score,
            stars: best.stars ?? 1,
            completed_at: new Date().toISOString(),
          });
        }
      }

      // 3. Migrate achievements
      for (const achId of localData.unlockedAchievements) {
        await supabase.from('user_achievements').upsert({
          user_id: userId,
          achievement_id: achId,
          unlocked_at: new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.warn('Error during local progress migration:', err);
      return false;
    }
  },
};
