import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_LEADERBOARD } from '../data/mockData';

export interface LeaderboardItem {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  score: number;
  timeMs: number;
  mistakes: number;
  levelId: number;
  completedAt: string;
  isCurrentUser?: boolean;
}

export type TimePeriodFilter = 'all-time' | 'month' | 'week';

export const leaderboardService = {
  /**
   * Fetch global or level leaderboard with period filtering and sorting.
   */
  async getLeaderboard(options: {
    levelId?: number | 'all';
    period?: TimePeriodFilter;
    limit?: number;
    currentUserId?: string | null;
  }): Promise<{ items: LeaderboardItem[]; userRankItem: LeaderboardItem | null; error: Error | null }> {
    const { levelId = 'all', period = 'all-time', limit = 25, currentUserId } = options;

    if (!isSupabaseConfigured) {
      // Offline / Unconfigured fallback: Use mock data tailored to level
      let mockFiltered = [...MOCK_LEADERBOARD];
      if (typeof levelId === 'number') {
        mockFiltered = mockFiltered.map((m) => ({ ...m, levelId }));
      }
      const items: LeaderboardItem[] = mockFiltered.map((m, idx) => ({
        rank: idx + 1,
        userId: m.playerId,
        username: m.playerName.toLowerCase(),
        displayName: m.playerName,
        avatar: m.avatarInitials,
        score: m.score,
        timeMs: m.timeMs,
        mistakes: 0,
        levelId: typeof levelId === 'number' ? levelId : m.levelId,
        completedAt: new Date().toISOString(),
        isCurrentUser: m.isCurrentPlayer,
      }));

      const userRank = items.find((i) => i.isCurrentUser) || null;
      return { items, userRankItem: userRank, error: null };
    }

    try {
      let query = supabase
        .from('games')
        .select(`
          id,
          user_id,
          level_id,
          score,
          time_ms,
          mistakes,
          completed_at,
          profiles!user_id (
            username,
            display_name,
            avatar
          )
        `)
        .order('score', { ascending: false })
        .order('time_ms', { ascending: true })
        .order('mistakes', { ascending: true })
        .limit(limit);

      if (typeof levelId === 'number') {
        query = query.eq('level_id', levelId);
      }

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('completed_at', weekAgo.toISOString());
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        query = query.gte('completed_at', monthAgo.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        return { items: [], userRankItem: null, error: new Error(error.message) };
      }

      // Format items with deduplication by user if multiple games exist (highest score per user)
      const seenUsers = new Set<string>();
      const rankedItems: LeaderboardItem[] = [];

      data?.forEach((row) => {
        if (!seenUsers.has(row.user_id)) {
          seenUsers.add(row.user_id);
          const prof = row.profiles as { username?: string; display_name?: string; avatar?: string } | null;
          rankedItems.push({
            rank: rankedItems.length + 1,
            userId: row.user_id,
            username: prof?.username || 'player',
            displayName: prof?.display_name || 'Hunter',
            avatar: prof?.avatar || '⚡',
            score: row.score,
            timeMs: row.time_ms,
            mistakes: row.mistakes,
            levelId: row.level_id,
            completedAt: row.completed_at,
            isCurrentUser: currentUserId ? row.user_id === currentUserId : false,
          });
        }
      });

      let userRankItem: LeaderboardItem | null = rankedItems.find((i) => i.isCurrentUser) || null;

      // If current user is not in top items, calculate user's specific rank
      if (currentUserId && !userRankItem) {
        const { data: userBestGame } = await supabase
          .from('games')
          .select(`
            id,
            user_id,
            level_id,
            score,
            time_ms,
            mistakes,
            completed_at,
            profiles!user_id (
              username,
              display_name,
              avatar
            )
          `)
          .eq('user_id', currentUserId)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (userBestGame) {
          // Count players with higher score
          const { count } = await supabase
            .from('games')
            .select('*', { count: 'exact', head: true })
            .gt('score', userBestGame.score);

          const prof = userBestGame.profiles as { username?: string; display_name?: string; avatar?: string } | null;
          userRankItem = {
            rank: (count ?? 0) + 1,
            userId: userBestGame.user_id,
            username: prof?.username || 'you',
            displayName: prof?.display_name || 'You',
            avatar: prof?.avatar || '⚡',
            score: userBestGame.score,
            timeMs: userBestGame.time_ms,
            mistakes: userBestGame.mistakes,
            levelId: userBestGame.level_id,
            completedAt: userBestGame.completed_at,
            isCurrentUser: true,
          };
        }
      }

      return { items: rankedItems, userRankItem, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch leaderboard';
      return { items: [], userRankItem: null, error: new Error(message) };
    }
  },
};
