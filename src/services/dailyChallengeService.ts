import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DailyChallengeRow, DailyChallengeScoreRow } from '../types/database';

export interface DailyLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  timeMs: number;
  mistakes: number;
  accuracy: number;
  score: number;
  completedAt: string;
  isCurrentUser?: boolean;
}

function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const dailyChallengeService = {
  /**
   * Fetch today's official daily challenge.
   * If not configured or offline, falls back to a deterministic daily challenge.
   */
  async getTodayChallenge(): Promise<DailyChallengeRow> {
    const todayDate = getTodayIsoDate();
    const fallbackChallenge: DailyChallengeRow = {
      id: `fallback-${todayDate}`,
      challenge_date: todayDate,
      level_id: 8, // Level 8 (12 numbers) is standard for daily challenge
      seed: `number-hunt-daily-${todayDate}-8`,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      return fallbackChallenge;
    }

    try {
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', todayDate)
        .maybeSingle();

      if (error || !data) {
        // Try creating today's challenge if it doesn't exist
        const { data: newChallenge } = await supabase
          .from('daily_challenges')
          .insert({
            challenge_date: todayDate,
            level_id: 8,
            seed: `number-hunt-daily-${todayDate}-8`,
          })
          .select('*')
          .maybeSingle();

        return newChallenge || fallbackChallenge;
      }

      return data;
    } catch {
      return fallbackChallenge;
    }
  },

  /**
   * Submit daily challenge score for an authenticated user.
   */
  async submitDailyScore(params: {
    challengeId: string;
    userId: string;
    timeMs: number;
    mistakes: number;
    accuracy: number;
    score: number;
  }): Promise<DailyChallengeScoreRow | null> {
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from('daily_challenge_scores')
        .upsert(
          {
            challenge_id: params.challengeId,
            user_id: params.userId,
            time_ms: params.timeMs,
            mistakes: params.mistakes,
            accuracy: params.accuracy,
            score: params.score,
            completed_at: new Date().toISOString(),
          },
          { onConflict: 'challenge_id,user_id' }
        )
        .select('*')
        .single();

      if (error) {
        console.warn('Failed to submit daily score:', error.message);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  },

  /**
   * Get user's score for a specific challenge.
   */
  async getUserDailyScore(challengeId: string, userId: string): Promise<DailyChallengeScoreRow | null> {
    if (!isSupabaseConfigured) return null;

    const { data } = await supabase
      .from('daily_challenge_scores')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .maybeSingle();

    return data;
  },

  /**
   * Get leaderboard for today's daily challenge.
   */
  async getDailyLeaderboard(challengeId: string, currentUserId?: string | null): Promise<DailyLeaderboardEntry[]> {
    if (!isSupabaseConfigured) {
      // Mock daily leaderboard fallback
      return [
        { rank: 1, userId: 'p1', username: 'alex', displayName: 'Alex', avatar: 'AX', timeMs: 4620, mistakes: 0, accuracy: 100, score: 9840, completedAt: new Date().toISOString() },
        { rank: 2, userId: 'p2', username: 'rahul', displayName: 'Rahul', avatar: 'RA', timeMs: 4890, mistakes: 0, accuracy: 100, score: 9510, completedAt: new Date().toISOString() },
        { rank: 3, userId: 'p3', username: 'chen', displayName: 'Chen', avatar: 'CH', timeMs: 5120, mistakes: 1, accuracy: 92, score: 9140, completedAt: new Date().toISOString() },
      ];
    }

    try {
      const { data, error } = await supabase
        .from('daily_challenge_scores')
        .select(`
          id,
          challenge_id,
          user_id,
          time_ms,
          mistakes,
          accuracy,
          score,
          completed_at,
          profiles!user_id (
            username,
            display_name,
            avatar
          )
        `)
        .eq('challenge_id', challengeId)
        .order('score', { ascending: false })
        .order('time_ms', { ascending: true })
        .order('mistakes', { ascending: true })
        .limit(50);

      if (error || !data) return [];

      return data.map((row, idx) => {
        const prof = row.profiles as { username?: string; display_name?: string; avatar?: string } | null;
        return {
          rank: idx + 1,
          userId: row.user_id,
          username: prof?.username || 'hunter',
          displayName: prof?.display_name || 'Hunter',
          avatar: prof?.avatar || '⚡',
          timeMs: row.time_ms,
          mistakes: row.mistakes,
          accuracy: row.accuracy,
          score: row.score,
          completedAt: row.completed_at,
          isCurrentUser: currentUserId ? row.user_id === currentUserId : false,
        };
      });
    } catch {
      return [];
    }
  },
};
